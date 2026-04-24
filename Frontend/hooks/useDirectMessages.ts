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
import type { DirectMessage } from "@/types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Socket } from "socket.io-client";

const DIRECT_MESSAGES_PAGE_SIZE = 10;

type MessageListPayload =
  | DirectMessage[]
  | { messages?: DirectMessage[]; nextCursor?: string | null; hasMore?: boolean };

type DirectMessagesPage = {
  messages: DirectMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

const directMessagesQueryKey = (chatId: string) => ["direct-messages", chatId] as const;

const DIRECT_MESSAGE_GET_ENDPOINT = (chatId: string) => `/messages/conversation/${chatId}`;
const DIRECT_MESSAGE_POST_ENDPOINT = (chatId: string) => `/messages/conversation/${chatId}`;
const DIRECT_MESSAGE_PATCH_ENDPOINT = (chatId: string, messageId: string) =>
  `/messages/conversation/${chatId}/${messageId}`;
const DIRECT_MESSAGE_DELETE_ENDPOINT = (chatId: string, messageId: string) =>
  `/messages/conversation/${chatId}/${messageId}`;
const DIRECT_MESSAGE_REPORT_ENDPOINT = (chatId: string, messageId: string) =>
  `/messages/conversation/${chatId}/${messageId}/report`;
const DIRECT_MESSAGE_REACTION_ENDPOINT = (chatId: string, messageId: string) =>
  `/messages/conversation/${chatId}/${messageId}/reactions`;

type SocketSendDirectMessageAck = {
  ok: boolean;
  message?: DirectMessage;
  error?: string;
};
type DirectMessageDeletedPayload = {
  messageId?: string;
  _id?: string;
  conversationId?: string;
};

const normalizeMessagesPayload = (payload: MessageListPayload): DirectMessagesPage => {
  if (Array.isArray(payload)) {
    const lastCreatedAt = payload[payload.length - 1]?.createdAt;
    const parsedCursor = lastCreatedAt ? new Date(lastCreatedAt) : null;
    const nextCursor =
      payload.length === DIRECT_MESSAGES_PAGE_SIZE &&
      parsedCursor &&
      !Number.isNaN(parsedCursor.getTime())
        ? parsedCursor.toISOString()
        : null;
    return {
      messages: payload,
      nextCursor,
      hasMore: payload.length === DIRECT_MESSAGES_PAGE_SIZE,
    };
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  return {
    messages,
    nextCursor: typeof payload?.nextCursor === "string" ? payload.nextCursor : null,
    hasMore:
      typeof payload?.hasMore === "boolean"
        ? payload.hasMore
        : messages.length === DIRECT_MESSAGES_PAGE_SIZE,
  };
};

const upsertMessage = (current: DirectMessage[], incoming: DirectMessage) => {
  const existingIdx = current.findIndex((m) => m._id === incoming._id);
  if (existingIdx >= 0) {
    const next = [...current];
    next[existingIdx] = incoming;
    return next;
  }
  return [...current, incoming];
};

const mergeDedupedMessages = (pages: DirectMessagesPage[] | undefined) => {
  const deduped = new Map<string, DirectMessage>();
  for (const page of pages ?? []) {
    for (const message of page.messages) {
      deduped.set(message._id, message);
    }
  }
  return [...deduped.values()];
};

const upsertMessageInPages = (pages: DirectMessagesPage[], incoming: DirectMessage) => {
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
  current: InfiniteData<DirectMessagesPage, string | undefined> | undefined,
  incoming: DirectMessage
): InfiniteData<DirectMessagesPage, string | undefined> => {
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
  current: InfiniteData<DirectMessagesPage, string | undefined> | undefined,
  messageId: string
): InfiniteData<DirectMessagesPage, string | undefined> | undefined => {
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
  current: InfiniteData<DirectMessagesPage, string | undefined> | undefined,
  optimisticId: string,
  incoming: DirectMessage
): InfiniteData<DirectMessagesPage, string | undefined> => {
  const withoutOptimistic = removeMessageFromInfiniteData(current, optimisticId);
  return applyIncomingToInfiniteData(withoutOptimistic, incoming);
};

export const useDirectMessages = (chatId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { getToken } = useAuth();
  const { isApiReady } = useSessionApiReady();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const getTokenRef = useRef(getToken);
  const query = useInfiniteQuery({
    queryKey: chatId ? directMessagesQueryKey(chatId) : (["direct-messages", "empty"] as const),
    queryFn: async ({ pageParam }) => {
      if (!chatId) return { messages: [], nextCursor: null, hasMore: false };
      const cursor = typeof pageParam === "string" ? pageParam : undefined;
      const { data } = await apiWithAuth<MessageListPayload>(
        {
          method: "GET",
          url: DIRECT_MESSAGE_GET_ENDPOINT(chatId),
          params: {
            limit: DIRECT_MESSAGES_PAGE_SIZE,
            ...(cursor ? { cursor } : {}),
          },
        },
        { timeout: 30000 }
      );
      return normalizeMessagesPayload(data);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined),
    enabled: Boolean(chatId && isApiReady),
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
    getTokenRef.current = () => resolveAuthToken(getToken);
  }, [getToken]);

  useEffect(() => {
    if (!chatId || !isApiReady) return;
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
        socket.emit("join-chat", chatId);
      });

      socket.on("new-message", (incoming: DirectMessage) => {
        if (!incoming?.conversation || String(incoming.conversation) !== chatId) return;
        queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
          directMessagesQueryKey(chatId),
          (current) => applyIncomingToInfiniteData(current, incoming)
        );
      });
      socket.on("direct-message-updated", (incoming: DirectMessage) => {
        if (!incoming?.conversation || String(incoming.conversation) !== chatId) return;
        queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
          directMessagesQueryKey(chatId),
          (current) => applyIncomingToInfiniteData(current, incoming)
        );
      });
      socket.on("direct-message-deleted", (incoming: DirectMessageDeletedPayload) => {
        const deletedId = String(incoming?.messageId ?? incoming?._id ?? "");
        const incomingConversationId = String(incoming?.conversationId ?? "");
        if (!deletedId) return;
        if (incomingConversationId && incomingConversationId !== chatId) return;
        queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
          directMessagesQueryKey(chatId),
          (current) => removeMessageFromInfiniteData(current, deletedId)
        );
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
      const socket = socketRef.current;
      if (socket) {
        socket.emit("leave-chat", chatId);
      }
      closeSocket?.();
      socketRef.current = null;
    };
  }, [chatId, isApiReady, queryClient]);

  const sendViaSocket = useCallback(
    async (input: { content?: string; fileUrl?: string }) => {
      const socket = socketRef.current;
      if (!chatId || !socket) {
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
            socket.emit("join-chat", chatId);
            resolve();
          };
          socket.on("connect", onConnect);
        });
      }

      return await new Promise<DirectMessage>((resolve, reject) => {
        socket.emit(
          "send-message",
          {
            chatId,
            content: input.content ?? "",
            fileUrl: input.fileUrl ?? "",
          },
          (ack: SocketSendDirectMessageAck) => {
            if (ack?.ok && ack.message) {
              resolve(ack.message);
              return;
            }
            reject(new Error(ack?.error || "Could not send message."));
          }
        );
      });
    },
    [chatId]
  );

  return {
    ...query,
    data: messages,
    hasOlderMessages: query.hasNextPage,
    isLoadingOlderMessages: query.isFetchingNextPage,
    loadOlderMessages: query.fetchNextPage,
    sendViaSocket,
  };
};

export const useSendDirectMessage = (
  chatId: string | null | undefined,
  sendViaSocket?: (input: { content?: string; fileUrl?: string }) => Promise<DirectMessage>
) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: { content?: string; fileUrl?: string }) => {
      const trimmedContent = (input.content ?? "").trim();
      const trimmedFileUrl = (input.fileUrl ?? "").trim();
      if (!chatId) throw new Error("Missing conversation id.");
      if (!trimmedContent && !trimmedFileUrl) throw new Error("Message cannot be empty.");

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

      const { data } = await apiWithAuth<DirectMessage>({
        method: "POST",
        url: DIRECT_MESSAGE_POST_ENDPOINT(chatId),
        data: { content: trimmedContent, fileUrl: trimmedFileUrl },
      });
      return data;
    },
    onMutate: async (input) => {
      if (!chatId) return undefined;
      await queryClient.cancelQueries({ queryKey: directMessagesQueryKey(chatId) });
      const previous = queryClient.getQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
        directMessagesQueryKey(chatId)
      );
      const optimisticId = `temp-dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();
      const optimisticMessage: DirectMessage = {
        _id: optimisticId,
        conversation: chatId,
        content: String(input.content ?? "").trim(),
        fileUrl: String(input.fileUrl ?? "").trim(),
        member: userId ? String(userId) : "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
        directMessagesQueryKey(chatId),
        (current) => applyIncomingToInfiniteData(current, optimisticMessage)
      );
      return { previous, optimisticId };
    },
    onSuccess: (created, _vars, context) => {
      if (!chatId) return;
      queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
        directMessagesQueryKey(chatId),
        (current) =>
          context?.optimisticId
            ? replaceOptimisticMessageInInfiniteData(current, context.optimisticId, created)
            : applyIncomingToInfiniteData(current, created)
      );
    },
    onError: (_error, _vars, context) => {
      if (!chatId) return;
      if (context?.previous) {
        queryClient.setQueryData(directMessagesQueryKey(chatId), context.previous);
      }
    },
  });
};

export const useUpdateDirectMessage = (chatId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { messageId: string; content: string }) => {
      const trimmed = input.content.trim();
      if (!chatId) throw new Error("Missing conversation id.");
      if (!input.messageId) throw new Error("Missing message id.");
      if (!trimmed) throw new Error("Message content is required.");

      const { data } = await apiWithAuth<DirectMessage>({
        method: "PATCH",
        url: DIRECT_MESSAGE_PATCH_ENDPOINT(chatId, input.messageId),
        data: { content: trimmed },
      });
      return data;
    },
    onSuccess: (updated) => {
      if (!chatId) return;
      queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
        directMessagesQueryKey(chatId),
        (current) => applyIncomingToInfiniteData(current, updated)
      );
    },
  });
};

export const useDeleteDirectMessage = (chatId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!chatId) throw new Error("Missing conversation id.");
      if (!messageId) throw new Error("Missing message id.");

      const { data } = await apiWithAuth<{ deleted: boolean; messageId: string }>({
        method: "DELETE",
        url: DIRECT_MESSAGE_DELETE_ENDPOINT(chatId, messageId),
      });
      return data.messageId;
    },
    onSuccess: (deletedMessageId) => {
      if (!chatId) return;
      queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
        directMessagesQueryKey(chatId),
        (current) => removeMessageFromInfiniteData(current, deletedMessageId)
      );
    },
  });
};

export const useReportDirectMessage = (chatId: string | null | undefined) => {
  const { apiWithAuth } = useApi();

  return useMutation({
    mutationFn: async (input: {
      messageId: string;
      reason?: string;
      category?: "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";
      details?: string;
    }) => {
      if (!chatId) throw new Error("Missing conversation id.");
      if (!input.messageId) throw new Error("Missing message id.");

      const { data } = await apiWithAuth<{ reported: boolean; duplicate?: boolean; reportId?: string }>({
        method: "POST",
        url: DIRECT_MESSAGE_REPORT_ENDPOINT(chatId, input.messageId),
        data: {
          reason: input.reason ?? "Direct message violates community guidelines",
          category: input.category ?? "other",
          details: input.details ?? "",
        },
      });
      return data;
    },
  });
};

export const useReactToDirectMessage = (chatId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { messageId: string; emoji: string }) => {
      if (!chatId) throw new Error("Missing conversation id.");
      if (!input.messageId) throw new Error("Missing message id.");
      if (!input.emoji.trim()) throw new Error("Emoji is required.");

      const { data } = await apiWithAuth<DirectMessage>({
        method: "POST",
        url: DIRECT_MESSAGE_REACTION_ENDPOINT(chatId, input.messageId),
        data: { emoji: input.emoji.trim() },
      });
      return data;
    },
    onSuccess: (updated) => {
      if (!chatId) return;
      queryClient.setQueryData<InfiniteData<DirectMessagesPage, string | undefined>>(
        directMessagesQueryKey(chatId),
        (current) => applyIncomingToInfiniteData(current, updated)
      );
    },
  });
};
