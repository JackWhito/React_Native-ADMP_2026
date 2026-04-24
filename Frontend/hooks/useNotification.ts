import { useApi } from "@/lib/axios";
import { useSessionApiReady } from "@/contexts/SessionProfileContext";
import { useAppAuthed } from "@/hooks/useAppAuthed";
import { openSocketWithLanUrls } from "@/lib/openSocketWithLanUrls";
import { resolveAuthToken } from "@/lib/resolveAuthToken";
import type { AppNotification } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";

const removeNotificationFromCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  notificationId: string
) => {
  queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) =>
    current.filter((n) => n._id !== notificationId)
  );
};

export const useNotifications = () => {
  const { apiWithAuth } = useApi();
  const { getToken } = useAuth();
  const { isAuthLoaded, isAuthed } = useAppAuthed();
  const { isApiReady } = useSessionApiReady();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const getTokenRef = useRef(getToken);
  const canUseNotifications = isAuthLoaded && isAuthed && isApiReady;

  useEffect(() => {
    getTokenRef.current = () => resolveAuthToken(getToken);
  }, [getToken]);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const all: AppNotification[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 50; i += 1) {
        const { data } = await apiWithAuth<{
          notifications: AppNotification[];
          nextCursor: string | null;
          hasMore: boolean;
        }>({
          method: "GET",
          url: "/notifications",
          params: { limit: 100, ...(cursor ? { cursor } : {}) },
        });
        all.push(...(data.notifications ?? []));
        if (!data.hasMore || !data.nextCursor) break;
        cursor = data.nextCursor;
      }
      return all;
    },
    enabled: canUseNotifications,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    if (!canUseNotifications) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    let cancelled = false;
    let closeSocket: (() => void) | null = null;
    const connectSocket = async () => {
      const token = await getTokenRef.current();
      if (!token || cancelled) return;

      closeSocket = openSocketWithLanUrls(
        { transports: ["websocket"], auth: { token } },
        (socket) => {
      socketRef.current = socket;

      socket.on("notification-created", (incoming: AppNotification) => {
        queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) => {
          if (!incoming?._id) return current;
          if (current.some((n) => n._id === incoming._id)) return current;
          return [incoming, ...current];
        });
      });

      socket.on(
        "notification-updated",
        (incoming: Partial<AppNotification> & { _id?: string }) => {
          if (!incoming?._id) return;
          const id = String(incoming._id);
          queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) => {
            let changed = false;
            const next = current.map((n) => {
              if (String(n._id) !== id) return n;
              changed = true;
              return { ...n, ...incoming } as AppNotification;
            });
            return changed ? next : current;
          });
        }
      );
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
      closeSocket?.();
      socketRef.current = null;
    };
  }, [canUseNotifications, queryClient]);

  return query;
};

export const useCreateServerInviteNotification = () => {
  const { apiWithAuth } = useApi();
  return useMutation({
    mutationFn: async (input: { serverId: string; recipientId: string }) => {
      const { data } = await apiWithAuth({
        method: "POST",
        url: "/notifications/server-invite",
        data: input,
      });
      return data;
    },
  });
};

export const useMarkNotificationAsRead = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiWithAuth<{ read: boolean; notificationId: string }>({
        method: "PATCH",
        url: `/notifications/${notificationId}/read`,
      });
      return data;
    },
    onSuccess: (_result, notificationId) => {
      const id = String(notificationId);
      queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) =>
        current.map((n) =>
          String(n._id) === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
    },
  });
};

export const useAcceptServerInvite = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiWithAuth({
        method: "POST",
        url: `/notifications/${notificationId}/accept`,
      });
      return data;
    },
    onSuccess: async (_result, notificationId) => {
      removeNotificationFromCache(queryClient, notificationId);
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
};

export const useRejectServerInvite = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiWithAuth({
        method: "POST",
        url: `/notifications/${notificationId}/reject`,
      });
      return data;
    },
    onSuccess: (_result, notificationId) => {
      removeNotificationFromCache(queryClient, notificationId);
    },
  });
};

export const useAcceptFriendInvite = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiWithAuth<{ accepted: boolean; conversationId: string }>({
        method: "POST",
        url: `/notifications/${notificationId}/friend-accept`,
      });
      return data;
    },
    onSuccess: async (_result, notificationId) => {
      removeNotificationFromCache(queryClient, notificationId);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useRejectFriendInvite = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiWithAuth<{ rejected: boolean }>({
        method: "POST",
        url: `/notifications/${notificationId}/friend-reject`,
      });
      return data;
    },
    onSuccess: (_result, notificationId) => {
      removeNotificationFromCache(queryClient, notificationId);
    },
  });
};
