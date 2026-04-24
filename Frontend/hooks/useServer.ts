import { useApi } from "@/lib/axios";
import { useSessionApiReady } from "@/contexts/SessionProfileContext";
import { useAppAuthed } from "@/hooks/useAppAuthed";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Server,
  ServerCategory,
  ServerChannel,
  ServerChannelList,
  ServerInvite,
  ServerMembersPayload,
  ServerWithChannels,
} from "@/types";

export const useServers = (options?: { enabled?: boolean }) => {
    const {apiWithAuth} = useApi()
    const { isAuthLoaded, isAuthed } = useAppAuthed();
    const { isApiReady } = useSessionApiReady();

    return useQuery<Server[]>({
        queryKey:["servers"],
        queryFn: async () => {
            const { data } = await apiWithAuth<Server[]>({ method: "GET", url: "/servers" });
            return Array.isArray(data) ? data : [];
        },
        enabled: Boolean(isAuthLoaded && isAuthed && isApiReady && (options?.enabled ?? true)),
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
    })
}

export const useCreateServer = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; imageUrl?: string }) => {
      const { data } = await apiWithAuth<ServerWithChannels>({
        method: "POST",
        url: "/servers",
        data: { name: input.name, imageUrl: input.imageUrl ?? "" },
      });
      return data;
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      if (created?._id) {
        await queryClient.invalidateQueries({ queryKey: ["server-channels", created._id] });
      }
    },
  });
};

export const useKickGuestMember = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serverId: string; memberId: string }) => {
      const { data } = await apiWithAuth<{ kicked: boolean; memberId: string }>({
        method: "DELETE",
        url: `/servers/${input.serverId}/members/${input.memberId}`,
      });
      return data;
    },
    onSuccess: async (_res, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["server-members", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channels", vars.serverId] });
    },
  });
};

export const useGrantMemberAdminRole = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serverId: string; memberId: string }) => {
      const { data } = await apiWithAuth<{ granted: boolean; memberId: string }>({
        method: "PATCH",
        url: `/servers/${input.serverId}/members/${input.memberId}/admin`,
      });
      return data;
    },
    onSuccess: async (_res, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["server-members", vars.serverId] });
    },
  });
};

export const useLeaveServer = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serverId: string) => {
      const { data } = await apiWithAuth<{ left: boolean; serverId: string }>({
        method: "DELETE",
        url: `/servers/${serverId}/leave`,
      });
      return data;
    },
    onSuccess: async (_res, serverId) => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["server-members", serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channels", serverId] });
    },
  });
};

export const useDeleteServer = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serverId: string) => {
      const { data } = await apiWithAuth<{ deleted: boolean; serverId: string }>({
        method: "DELETE",
        url: `/servers/${serverId}`,
      });
      return data;
    },
    onSuccess: async (_res, serverId) => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["server-members", serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channels", serverId] });
    },
  });
};

export const useUpdateServer = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { serverId: string; name: string; imageUrl?: string }) => {
      const { data } = await apiWithAuth<Server>({
        method: "PATCH",
        url: `/servers/${input.serverId}`,
        data: { name: input.name, imageUrl: input.imageUrl ?? "" },
      });
      return data;
    },
    onSuccess: async (_updated, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["server-channels", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", vars.serverId] });
    },
  });
};

export const useServerChannels = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();

  return useQuery({
    queryKey: ["server-channels", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerChannel[]>({
        method: "GET",
        url: `/servers/${serverId}/channels`,
      });
      return data;
    },
    enabled: Boolean(serverId && isApiReady),
  });
};

export const useServerChannelList = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();

  return useQuery({
    queryKey: ["server-channel-list", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerChannelList>({
        method: "GET",
        url: `/servers/${serverId}/channel-list`,
      });
      return data;
    },
    enabled: Boolean(serverId && isApiReady),
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
};

export const useCreateServerCategory = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { serverId: string; name: string }) => {
      const { data } = await apiWithAuth<ServerCategory>({
        method: "POST",
        url: `/servers/${input.serverId}/categories`,
        data: { name: input.name },
      });
      return data;
    },
    onSuccess: async (_created, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["server-channels", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", vars.serverId] });
    },
  });
};

export const useUpdateServerCategory = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serverId: string; categoryId: string; name: string }) => {
      const { data } = await apiWithAuth<ServerCategory>({
        method: "PATCH",
        url: `/servers/${input.serverId}/categories/${input.categoryId}`,
        data: { name: input.name },
      });
      return data;
    },
    onSuccess: async (_updated, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["server-channels", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", vars.serverId] });
    },
  });
};

export const useDeleteServerCategory = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serverId: string; categoryId: string }) => {
      const { data } = await apiWithAuth<{ deleted: boolean; categoryId: string }>({
        method: "DELETE",
        url: `/servers/${input.serverId}/categories/${input.categoryId}`,
      });
      return data;
    },
    onSuccess: async (_res, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["server-channels", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", vars.serverId] });
    },
  });
};

export const useServerInvite = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();

  return useQuery({
    queryKey: ["server-invite", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerInvite>({
        method: "GET",
        url: `/servers/${serverId}/invite`,
      });
      return data;
    },
    enabled: Boolean(serverId && isApiReady),
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
};

export const useServerMembers = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();
  const { isApiReady } = useSessionApiReady();

  return useQuery({
    queryKey: ["server-members", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerMembersPayload>({
        method: "GET",
        url: `/servers/${serverId}/members`,
      });
      return data;
    },
    enabled: Boolean(serverId && isApiReady),
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
};

export const useCreateServerChannel = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      serverId: string;
      name: string;
      categoryId: string;
      type?: "text" | "audio" | "video";
    }) => {
      const { data } = await apiWithAuth<ServerChannel>({
        method: "POST",
        url: `/servers/${input.serverId}/channels`,
        data: {
          name: input.name,
          categoryId: input.categoryId,
          type: input.type ?? "text",
        },
      });
      return data;
    },
    onSuccess: async (_created, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["server-channels", vars.serverId] });
      await queryClient.invalidateQueries({ queryKey: ["server-channel-list", vars.serverId] });
    },
  });
};

export const useJoinServerByInvite = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data } = await apiWithAuth<{
        joined: boolean;
        serverId: string;
        serverName: string;
      }>({
        method: "POST",
        url: `/servers/invite/${encodeURIComponent(inviteCode)}/join`,
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
};

export const useReportServer = () => {
  const { apiWithAuth } = useApi();
  return useMutation({
    mutationFn: async (input: {
      serverId: string;
      reason?: string;
      category?: "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";
      details?: string;
    }) => {
      if (!input.serverId) throw new Error("Missing server id.");
      const { data } = await apiWithAuth<{ reported: boolean; duplicate?: boolean; reportId?: string }>({
        method: "POST",
        url: `/servers/${input.serverId}/report`,
        data: {
          reason: input.reason ?? "Server violates community guidelines",
          category: input.category ?? "other",
          details: input.details ?? "",
        },
      });
      return data;
    },
  });
};