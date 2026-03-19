import { useApi } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Server } from "@/types";

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
      const { data } = await apiWithAuth<Server>({
        method: "POST",
        url: "/servers",
        data: { name: input.name, imageUrl: input.imageUrl ?? "" },
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
};