import { useApi } from "@/lib/axios";
import type { AppNotification } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { useEffect, useMemo, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const resolveSocketUrl = () => {
  const rawBaseUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    "http://192.168.1.11:5000/api";
  return rawBaseUrl.replace(/\/api\/?$/, "");
};

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const getTokenRef = useRef(getToken);
  const socketUrl = useMemo(() => resolveSocketUrl(), []);
  const canUseNotifications = isLoaded && isSignedIn;

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await apiWithAuth<AppNotification[]>({
        method: "GET",
        url: "/notifications",
      });
      return data;
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
    const connectSocket = async () => {
      const token = await getTokenRef.current();
      if (!token || cancelled) return;

      const socket = io(socketUrl, {
        transports: ["websocket"],
        auth: { token },
      });
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
          queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) => {
            let changed = false;
            const next = current.map((n) => {
              if (n._id !== incoming._id) return n;
              changed = true;
              return { ...n, ...incoming } as AppNotification;
            });
            return changed ? next : current;
          });
        }
      );
    };

    connectSocket();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [canUseNotifications, queryClient, socketUrl]);

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
      queryClient.setQueryData<AppNotification[]>(["notifications"], (current = []) =>
        current.map((n) =>
          n._id === notificationId
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
