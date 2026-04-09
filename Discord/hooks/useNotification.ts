import { useApi } from "@/lib/axios";
import type { AppNotification } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useNotifications = () => {
  const { apiWithAuth } = useApi();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await apiWithAuth<AppNotification[]>({
        method: "GET",
        url: "/notifications",
      });
      return data;
    },
  });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
