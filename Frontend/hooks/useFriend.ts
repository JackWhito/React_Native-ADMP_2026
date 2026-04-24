import { useApi } from "@/lib/axios";
import { useSessionApiReady } from "@/contexts/SessionProfileContext";
import type { FriendInvitePayload, FriendSearchResult } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useFriendInviteLink = () => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();
  return useQuery({
    queryKey: ["friend-invite-link"],
    queryFn: async () => {
      const { data } = await apiWithAuth<FriendInvitePayload>({
        method: "GET",
        url: "/users/friend-invite",
      });
      return data;
    },
    enabled: isApiReady,
  });
};

export const useSearchProfiles = (q: string) => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();
  return useQuery({
    queryKey: ["friend-search", q],
    queryFn: async () => {
      const { data } = await apiWithAuth<FriendSearchResult[]>({
        method: "GET",
        url: `/users/search?q=${encodeURIComponent(q)}`,
      });
      return data;
    },
    enabled: q.trim().length > 0 && isApiReady,
  });
};

export const useAddFriendByName = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      const { data } = await apiWithAuth({
        method: "POST",
        url: "/users/friends/by-name",
        data: { username },
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useAddFriendByLink = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkOrCode: string) => {
      const { data } = await apiWithAuth({
        method: "POST",
        url: "/users/friends/by-link",
        data: { linkOrCode },
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useSharedServers = (profileId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();
  return useQuery({
    queryKey: ["shared-servers", profileId],
    queryFn: async () => {
      const { data } = await apiWithAuth<{
        servers: Array<{ _id: string; name: string; imageUrl?: string }>;
        total: number;
      }>({
        method: "GET",
        url: `/users/${profileId}/shared-servers`,
      });
      return data;
    },
    enabled: Boolean(profileId && isApiReady),
  });
};
