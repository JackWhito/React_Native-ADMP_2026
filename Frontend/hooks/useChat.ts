import { useApi } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import type { Chat } from "@/types";

export const useChat = (options?: { enabled?: boolean }) => {
    const {apiWithAuth} = useApi()
    const { isLoaded, isSignedIn } = useAuth();

    return useQuery({
        queryKey:["conversations"],
        queryFn: async () => {
            const {data} = await apiWithAuth<Chat[]>({method:"GET", url:"/conversations"})
            return data as Chat[];
        },
        enabled: Boolean(isLoaded && isSignedIn && (options?.enabled ?? true)),
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
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