import { useApi } from "@/lib/axios";

import { useMutation } from "@tanstack/react-query";

export const useAuthCallback = () => {
    const {apiWithAuth} = useApi();

    const result = useMutation({
        mutationFn: async () => {
            const {data} = await apiWithAuth({method:"POST", url:"auth/callback"});
            return data;
        }
    })
    return result;
}