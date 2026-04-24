import { useApi } from "@/lib/axios";
import { useSessionApiReady } from "@/contexts/SessionProfileContext";
import { openSocketWithLanUrls } from "@/lib/openSocketWithLanUrls";
import { resolveAuthToken } from "@/lib/resolveAuthToken";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { ChannelMessage } from "@/types";

const CHANNEL_MESSAGES_PAGE_SIZE = 10;
type MessageListPayload =
  | ChannelMessage[]
  | { messages?: ChannelMessage[]; nextCursor?: string | null; hasMore?: boolean };
type ChannelMessagesPage = {
  messages: ChannelMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

const channelMessagesQueryKey = (channelId: string) => [
  "channel-messages",
  channelId,
] as const;

const CHANNEL_MESSAGE_GET_ENDPOINT = (channelId: string) => `/messages/channel/${channelId}`;
const CHANNEL_MESSAGE_POST_ENDPOINT = (channelId: string) => `/messages/channel/${channelId}`;
const CHANNEL_MESSAGE_PATCH_ENDPOINT = (channelId: string, messageId: string) =>
  `/messages/channel/${channelId}/${messageId}`;
const CHANNEL_MESSAGE_DELETE_ENDPOINT = (channelId: string, messageId: string) =>
  `/messages/channel/${channelId}/${messageId}`;
const CHANNEL_MESSAGE_REPORT_ENDPOINT = (channelId: string, messageId: string) =>
  `/messages/channel/${channelId}/${messageId}/report`;
const CHANNEL_MESSAGE_REACTION_ENDPOINT = (channelId: string, messageId: string) =>
  `/messages/channel/${channelId}/${messageId}/reactions`;

const normalizeMessagesPayload = (payload: MessageListPayload): ChannelMessagesPage => {
  if (Array.isArray(payload)) {
    const lastCreatedAt = payload[payload.length - 1]?.createdAt;
    const parsedCursor = lastCreatedAt ? new Date(lastCreatedAt) : null;
    const nextCursor =
      payload.length === CHANNEL_MESSAGES_PAGE_SIZE &&
      parsedCursor &&
      !Number.isNaN(parsedCursor.getTime())
        ? parsedCursor.toISOString()
        : null;
    return {
      messages: payload,
      nextCursor,
      hasMore: payload.length === CHANNEL_MESSAGES_PAGE_SIZE,
    };
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  return {
    messages,
    nextCursor: typeof payload?.nextCursor === "string" ? payload.nextCursor : null,
    hasMore:
      typeof payload?.hasMore === "boolean"
        ? payload.hasMore
        : messages.length === CHANNEL_MESSAGES_PAGE_SIZE,
  };
};

type TypingUser = {
  userId: string;
  name: string;
};

type ChannelTypingPayload = {
  channelId?: string;
  userId?: string;
  name?: string;
  isTyping?: boolean;
};

type SocketSendChannelMessageAck = {
  ok: boolean;
  message?: ChannelMessage;
  error?: string;
};
type ChannelMessageDeletedPayload = {
  messageId?: string;
  _id?: string;
};

const upsertMessage = (current: ChannelMessage[], incoming: ChannelMessage) => {
  const existingIdx = current.findIndex((m) => m._id === incoming._id);
  if (existingIdx >= 0) {
    const next = [...current];
    next[existingIdx] = incoming;
    return next;
  }
  return [...current, incoming];
};

const mergeDedupedMessages = (pages: ChannelMessagesPage[] | undefined) => {
  const deduped = new Map<string, ChannelMessage>();
  for (const page of pages ?? []) {
    for (const message of page.messages) {
      deduped.set(message._id, message);
    }
  }
  return [...deduped.values()];
};

const upsertMessageInPages = (pages: ChannelMessagesPage[], incoming: ChannelMessage) => {
  let found = false;
  const nextPages = pages.map((page) => {
    const nextMessages = upsertMessage(page.messages, incoming);
    if (nextMessages !== page.messages && nextMessages.length === page.messages.length) {
      found = true;
      return { ...page, messages: nextMessages };
    }
    return page;
  });

  if (found) return nextPages;
  if (!nextPages.length) {
    return [{ messages: [incoming], nextCursor: null, hasMore: false }];
  }

  const [firstPage, ...rest] = nextPages;
  return [{ ...firstPage, messages: upsertMessage(firstPage.messages, incoming) }, ...rest];
};

const applyIncomingToInfiniteData = (
  current: InfiniteData<ChannelMessagesPage, string | undefined> | undefined,
  incoming: ChannelMessage
): InfiniteData<ChannelMessagesPage, string | undefined> => {
  if (!current) {
    return {
      pages: [{ messages: [incoming], nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    };
  }

  return {
    ...current,
    pages: upsertMessageInPages(current.pages, incoming),
  };
};

const removeMessageFromInfiniteData = (
  current: InfiniteData<ChannelMessagesPage, string | undefined> | undefined,
  messageId: string
): InfiniteData<ChannelMessagesPage, string | undefined> | undefined => {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      messages: page.messages.filter((msg) => msg._id !== messageId),
    })),
  };
};

const replaceOptimisticMessageInInfiniteData = (
  current: InfiniteData<ChannelMessagesPage, string | undefined> | undefined,
  optimisticId: string,
  incoming: ChannelMessage
): InfiniteData<ChannelMessagesPage, string | undefined> => {
  const withoutOptimistic = removeMessageFromInfiniteData(current, optimisticId);
  return applyIncomingToInfiniteData(withoutOptimistic, incoming);
};

export const useChannelMessages = (channelId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { getToken } = useAuth();
  const { isApiReady } = useSessionApiReady();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const getTokenRef = useRef(getToken);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const queryKey = useMemo(
    () =>
      channelId
        ? channelMessagesQueryKey(channelId)
        : (["channel-messages", "empty"] as const),
    [channelId]
  );

  useEffect(() => {
    getTokenRef.current = () => resolveAuthToken(getToken);
  }, [getToken]);

  useEffect(() => {
    setTypingUsers([]);
  }, [channelId]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      if (!channelId) return { messages: [], nextCursor: null, hasMore: false };
      const cursor = typeof pageParam === "string" ? pageParam : undefined;
      const { data } = await apiWithAuth<MessageListPayload>({
        method: "GET",
        url: CHANNEL_MESSAGE_GET_ENDPOINT(channelId),
        params: {
          limit: CHANNEL_MESSAGES_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        },
      }, { timeout: 30000 });
      return normalizeMessagesPayload(data);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined),
    enabled: Boolean(channelId && isApiReady),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const messages = useMemo(
    () =>
      mergeDedupedMessages(query.data?.pages).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [query.data?.pages]
  );

  useEffect(() => {
    if (!channelId || !isApiReady) return;
    let cancelled = false;
    let closeSocket: (() => void) | null = null;

    const connectSocket = async () => {
      const token = await getTokenRef.current();
      if (!token || cancelled) return;

      closeSocket = openSocketWithLanUrls(
        { transports: ["websocket"], auth: { token } },
        (socket) => {
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-channel", channelId);
      });

      socket.on("online-users", (payload: { usersId?: string[] }) => {
        const ids = Array.isArray(payload?.usersId) ? payload.usersId.map(String) : [];
        setOnlineUserIds((current) => {
          if (current.length === ids.length && current.every((value, index) => value === ids[index])) {
            return current;
          }
          return ids;
        });
      });

      socket.on("user-online", (payload: { userId?: string }) => {
        const id = String(payload?.userId ?? "");
        if (!id) return;
        setOnlineUserIds((current) => (current.includes(id) ? current : [...current, id]));
      });

      socket.on("user-offline", (payload: { userId?: string }) => {
        const id = String(payload?.userId ?? "");
        if (!id) return;
        setOnlineUserIds((current) => current.filter((value) => value !== id));
      });

      socket.on("channel-message-created", (incoming: ChannelMessage) => {
        queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
          queryKey,
          (current) => applyIncomingToInfiniteData(current, incoming)
        );
      });
      socket.on("channel-message-updated", (incoming: ChannelMessage) => {
        queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
          queryKey,
          (current) => applyIncomingToInfiniteData(current, incoming)
        );
      });
      socket.on("channel-message-deleted", (incoming: ChannelMessageDeletedPayload) => {
        const deletedId = String(incoming?.messageId ?? incoming?._id ?? "");
        if (!deletedId) return;
        queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
          queryKey,
          (current) => removeMessageFromInfiniteData(current, deletedId)
        );
      });

      socket.on("channel-typing", (payload: ChannelTypingPayload) => {
        if (!payload?.channelId || payload.channelId !== channelId) return;
        const typingUserId = String(payload.userId ?? "");
        if (!typingUserId) return;
        const typingName = String(payload.name ?? "Member").trim() || "Member";

        setTypingUsers((current) => {
          const existing = current.find((u) => u.userId === typingUserId);
          if (payload.isTyping) {
            if (existing) {
              return current.map((u) =>
                u.userId === typingUserId ? { ...u, name: typingName } : u
              );
            }
            return [...current, { userId: typingUserId, name: typingName }];
          }
          return current.filter((u) => u.userId !== typingUserId);
        });
      });
        }
      );
      if (cancelled) {
        closeSocket();
        closeSocket = null;
        socketRef.current = null;
      }
    };

    void connectSocket();

    return () => {
      cancelled = true;
      setTypingUsers([]);
      setOnlineUserIds([]);
      const socket = socketRef.current;
      if (socket) {
        socket.emit("leave-channel", channelId);
      }
      closeSocket?.();
      socketRef.current = null;
    };
  }, [channelId, isApiReady, queryClient, queryKey]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelId) return;
      socketRef.current?.emit("channel-typing", { channelId, isTyping });
    },
    [channelId]
  );

  const sendViaSocket = useCallback(
    async (input: { content?: string; fileUrl?: string }) => {
      const socket = socketRef.current;
      if (!channelId || !socket) {
        throw new Error("Socket is not connected.");
      }

      if (!socket.connected) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.off("connect", onConnect);
            reject(new Error("Socket is not connected."));
          }, 1200);
          const onConnect = () => {
            clearTimeout(timeout);
            socket.off("connect", onConnect);
            socket.emit("join-channel", channelId);
            resolve();
          };
          socket.on("connect", onConnect);
        });
      }

      return await new Promise<ChannelMessage>((resolve, reject) => {
        socket.emit(
          "send-channel-message",
          {
            channelId,
            content: input.content ?? "",
            fileUrl: input.fileUrl ?? "",
          },
          (ack: SocketSendChannelMessageAck) => {
            if (ack?.ok && ack.message) {
              resolve(ack.message);
              return;
            }
            reject(new Error(ack?.error || "Could not send message."));
          }
        );
      });
    },
    [channelId]
  );

  return {
    ...query,
    data: messages,
    hasOlderMessages: query.hasNextPage,
    isLoadingOlderMessages: query.isFetchingNextPage,
    loadOlderMessages: query.fetchNextPage,
    typingUsers,
    onlineUserIds,
    setTyping,
    sendViaSocket,
  };
};

export const useSendChannelMessage = (
  channelId: string | null | undefined,
  sendViaSocket?: (input: { content?: string; fileUrl?: string }) => Promise<ChannelMessage>
) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: { content?: string; fileUrl?: string }) => {
      const trimmedContent = (input.content ?? "").trim();
      const trimmedFileUrl = (input.fileUrl ?? "").trim();
      if (!channelId) throw new Error("Missing channel id.");
      if (!trimmedContent && !trimmedFileUrl) {
        throw new Error("Message cannot be empty.");
      }

      if (sendViaSocket) {
        try {
          return await sendViaSocket({
            content: trimmedContent,
            fileUrl: trimmedFileUrl,
          });
        } catch {
          // Fallback to HTTP if socket is unavailable.
        }
      }

      const { data } = await apiWithAuth<ChannelMessage | { message?: ChannelMessage }>({
        method: "POST",
        url: CHANNEL_MESSAGE_POST_ENDPOINT(channelId),
        data: { content: trimmedContent, fileUrl: trimmedFileUrl },
      });

      if (data && !Array.isArray(data) && "message" in data && data.message) {
        return data.message;
      }
      return data as ChannelMessage;
    },
    onMutate: async (input) => {
      if (!channelId) return undefined;
      await queryClient.cancelQueries({ queryKey: channelMessagesQueryKey(channelId) });
      const previous = queryClient.getQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
        channelMessagesQueryKey(channelId)
      );
      const optimisticId = `temp-channel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();
      const optimisticMessage: ChannelMessage = {
        _id: optimisticId,
        channel: channelId,
        content: String(input.content ?? "").trim(),
        fileUrl: String(input.fileUrl ?? "").trim(),
        member: userId ? String(userId) : "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
        channelMessagesQueryKey(channelId),
        (current) => applyIncomingToInfiniteData(current, optimisticMessage)
      );
      return { previous, optimisticId };
    },
    onSuccess: async (created, _vars, context) => {
      if (!channelId) return;
      queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
        channelMessagesQueryKey(channelId),
        (current) =>
          context?.optimisticId
            ? replaceOptimisticMessageInInfiniteData(current, context.optimisticId, created)
            : applyIncomingToInfiniteData(current, created)
      );
    },
    onError: (_error, _vars, context) => {
      if (!channelId) return;
      if (context?.previous) {
        queryClient.setQueryData(channelMessagesQueryKey(channelId), context.previous);
      }
    },
  });
};

export const useUpdateChannelMessage = (channelId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { messageId: string; content: string }) => {
      const trimmed = input.content.trim();
      if (!channelId) throw new Error("Missing channel id.");
      if (!input.messageId) throw new Error("Missing message id.");
      if (!trimmed) throw new Error("Message content is required.");

      const { data } = await apiWithAuth<ChannelMessage>({
        method: "PATCH",
        url: CHANNEL_MESSAGE_PATCH_ENDPOINT(channelId, input.messageId),
        data: { content: trimmed },
      });
      return data;
    },
    onSuccess: (updated) => {
      if (!channelId) return;
      queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
        channelMessagesQueryKey(channelId),
        (current) => applyIncomingToInfiniteData(current, updated)
      );
    },
  });
};

export const useDeleteChannelMessage = (channelId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!channelId) throw new Error("Missing channel id.");
      if (!messageId) throw new Error("Missing message id.");

      await apiWithAuth<{ deleted: boolean; messageId: string }>({
        method: "DELETE",
        url: CHANNEL_MESSAGE_DELETE_ENDPOINT(channelId, messageId),
      });
      return messageId;
    },
    onSuccess: async (deletedMessageId) => {
      if (!channelId) return;
      queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
        channelMessagesQueryKey(channelId),
        (current) => removeMessageFromInfiniteData(current, deletedMessageId)
      );
      await queryClient.invalidateQueries({ queryKey: channelMessagesQueryKey(channelId) });
    },
  });
};

export const useReportChannelMessage = (channelId: string | null | undefined) => {
  const { apiWithAuth } = useApi();

  return useMutation({
    mutationFn: async (input: {
      messageId: string;
      reason?: string;
      category?: "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";
      details?: string;
    }) => {
      if (!channelId) throw new Error("Missing channel id.");
      if (!input.messageId) throw new Error("Missing message id.");

      const { data } = await apiWithAuth<{ reported: boolean; duplicate?: boolean; reportId?: string }>({
        method: "POST",
        url: CHANNEL_MESSAGE_REPORT_ENDPOINT(channelId, input.messageId),
        data: {
          reason: input.reason ?? "Message violates community guidelines",
          category: input.category ?? "other",
          details: input.details ?? "",
        },
      });
      return data;
    },
  });
};

export const useReactToChannelMessage = (channelId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { messageId: string; emoji: string }) => {
      if (!channelId) throw new Error("Missing channel id.");
      if (!input.messageId) throw new Error("Missing message id.");
      if (!input.emoji.trim()) throw new Error("Emoji is required.");

      const { data } = await apiWithAuth<ChannelMessage>({
        method: "POST",
        url: CHANNEL_MESSAGE_REACTION_ENDPOINT(channelId, input.messageId),
        data: { emoji: input.emoji.trim() },
      });
      return data;
    },
    onSuccess: (updated) => {
      if (!channelId) return;
      queryClient.setQueryData<InfiniteData<ChannelMessagesPage, string | undefined>>(
        channelMessagesQueryKey(channelId),
        (current) => applyIncomingToInfiniteData(current, updated)
      );
    },
  });
};
