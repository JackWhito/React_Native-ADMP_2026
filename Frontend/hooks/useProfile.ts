import { useApi } from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";

export type MyProfile = {
  _id: string;
  clerkId: string;
  name: string;
  username?: string;
  bio?: string;
  imageUrl?: string;
  email: string;
  createdAt: string;
};

export type UserReportCategory =
  | "spam"
  | "harassment"
  | "hate"
  | "nudity"
  | "violence"
  | "scam"
  | "other";

export const useMyProfile = () => {
  const { apiWithAuth } = useApi();
  const { isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await apiWithAuth<MyProfile>({ method: "GET", url: "/users/me" });
      return data;
    },
    enabled: Boolean(isLoaded && isSignedIn),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
};

export const useUpdateMyProfile = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; bio: string }) => {
      const { data } = await apiWithAuth<MyProfile>({
        method: "PATCH",
        url: "/users/me",
        data: { name: input.name, bio: input.bio },
      });
      return data;
    },
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(["my-profile"], updatedProfile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
};

export const useUpdateAccountSettings = () => {
  const { apiWithAuth } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { username: string; name: string; email: string }) => {
      const { data } = await apiWithAuth<MyProfile>({
        method: "PATCH",
        url: "/users/account",
        data: input,
      });
      return data;
    },
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(["my-profile"], updatedProfile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
};

export const useDeleteAccount = () => {
  const { apiWithAuth } = useApi();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiWithAuth<{ deleted: boolean }>({
        method: "DELETE",
        url: "/users/account",
      });
      return data;
    },
  });
};

export const useReportUser = () => {
  const { apiWithAuth } = useApi();
  return useMutation({
    mutationFn: async (input: {
      profileId: string;
      reason?: string;
      category?: UserReportCategory;
      details?: string;
    }) => {
      if (!input.profileId) throw new Error("Missing profile id.");
      const { data } = await apiWithAuth<{ reported: boolean; duplicate?: boolean; reportId?: string }>({
        method: "POST",
        url: `/users/${input.profileId}/report`,
        data: {
          reason: input.reason ?? "User violates community guidelines",
          category: input.category ?? "other",
          details: input.details ?? "",
        },
      });
      return data;
    },
  });
};

export const useBlockUser = () => {
  const { apiWithAuth } = useApi();
  return useMutation({
    mutationFn: async (input: { profileId: string }) => {
      if (!input.profileId) throw new Error("Missing profile id.");
      const { data } = await apiWithAuth<{ blocked: boolean; alreadyBlocked?: boolean; profileId: string }>({
        method: "POST",
        url: `/users/${input.profileId}/block`,
      });
      return data;
    },
  });
};
