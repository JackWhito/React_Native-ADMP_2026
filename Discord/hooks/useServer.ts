import { useApi } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Server,
  ServerCategory,
  ServerChannel,
  ServerChannelList,
  ServerInvite,
  ServerWithChannels,
} from "@/types";

export const useServers = () => {
    const {apiWithAuth} = useApi()

    return useQuery({
        queryKey:["servers"],
        queryFn: async () => {
            const {data} = await apiWithAuth({method:"GET", url:"/servers"})
            return data;
        }
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

export const useServerChannels = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();

  return useQuery({
    queryKey: ["server-channels", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerChannel[]>({
        method: "GET",
        url: `/servers/${serverId}/channels`,
      });
      return data;
    },
    enabled: !!serverId,
  });
};

export const useServerChannelList = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();

  return useQuery({
    queryKey: ["server-channel-list", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerChannelList>({
        method: "GET",
        url: `/servers/${serverId}/channel-list`,
      });
      return data;
    },
    enabled: !!serverId,
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

export const useServerInvite = (serverId: string | null | undefined) => {
  const { apiWithAuth } = useApi();

  return useQuery({
    queryKey: ["server-invite", serverId],
    queryFn: async () => {
      const { data } = await apiWithAuth<ServerInvite>({
        method: "GET",
        url: `/servers/${serverId}/invite`,
      });
      return data;
    },
    enabled: !!serverId,
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