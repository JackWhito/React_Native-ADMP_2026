import { useApi } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

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