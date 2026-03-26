import { useApi } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Server, ServerChannel, ServerWithChannels } from "@/types";

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