import { useApi } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export const useChat = () => {
    const {apiWithAuth} = useApi()

    return useQuery({
        queryKey:["conversations"],
        queryFn: async () => {
            const {data} = await apiWithAuth({method:"GET", url:"/conversations"})
            return data;
        }
    })
}