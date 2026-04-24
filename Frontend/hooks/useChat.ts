import { useApi } from "@/lib/axios";
import { useSessionApiReady } from "@/contexts/SessionProfileContext";
import { useAppAuthed } from "@/hooks/useAppAuthed";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Chat } from "@/types";

export const useChat = (options?: { enabled?: boolean }) => {
    const {apiWithAuth} = useApi()
    const { isAuthLoaded, isAuthed } = useAppAuthed();
    const { isApiReady } = useSessionApiReady();

    return useQuery<Chat[]>({
        queryKey:["conversations"],
        queryFn: async () => {
            const all: Chat[] = [];
            let cursor: string | undefined;
            for (let i = 0; i < 50; i += 1) {
                const { data } = await apiWithAuth<{
                    conversations: Chat[];
                    nextCursor: string | null;
                    hasMore: boolean;
                }>({
                    method: "GET",
                    url: "/conversations",
                    params: { limit: 100, ...(cursor ? { cursor } : {}) },
                });
                all.push(...(data.conversations ?? []));
                if (!data.hasMore || !data.nextCursor) break;
                cursor = data.nextCursor;
            }
            return all;
        },
        enabled: Boolean(isAuthLoaded && isAuthed && isApiReady && (options?.enabled ?? true)),
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