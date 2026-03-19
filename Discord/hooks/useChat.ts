import { useApi } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Chat } from "@/types";

export const useChat = () => {
    const {apiWithAuth} = useApi()

    return useQuery({
        queryKey:["conversations"],
        queryFn: async () => {
            const {data} = await apiWithAuth<Chat[]>({method:"GET", url:"/conversations"})
            return data as Chat[];
        }
    })
}

export const useGetOrCreateConversation = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userTwoId: string) => {
      const { data } = await apiWithAuth<{ _id: string }>({
        method: "POST",
        url: `/conversations/${userTwoId}`,
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};