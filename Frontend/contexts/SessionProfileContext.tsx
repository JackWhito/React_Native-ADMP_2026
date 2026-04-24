import { useApi } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { createContext, useContext, type ReactNode } from "react";
import { useLocalAuth } from "./LocalAuthContext";

type SessionProfileValue = {
  isApiReady: boolean;
  isPending: boolean;
  isError: boolean;
};

const SessionProfileContext = createContext<SessionProfileValue>({
  isApiReady: false,
  isPending: false,
  isError: false,
});

/**
 * Email/password: GET /api/users/me after app JWT is stored.
 * Google (Clerk): POST /api/auth/callback to create/refresh the app profile.
 */
function SessionProfileProviderImpl({ children }: { children: ReactNode }) {
  const { apiWithAuth } = useApi();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isLocalAuthed, isHydrated: localReady } = useLocalAuth();

  const hasSession = isLocalAuthed || Boolean(isSignedIn && userId);

  const query = useQuery({
    queryKey: ["session-profile", isLocalAuthed ? "local" : userId],
    queryFn: async () => {
      if (isLocalAuthed) {
        const { data } = await apiWithAuth<unknown>({ method: "GET", url: "/users/me" });
        return data;
      }
      const { data } = await apiWithAuth<unknown>({ method: "POST", url: "auth/callback" });
      return data;
    },
    enabled: Boolean(isLoaded && localReady && hasSession),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60_000,
    retry: 2,
  });

  const value: SessionProfileValue = {
    isApiReady: query.isSuccess,
    isPending: query.isPending,
    isError: query.isError,
  };

  return <SessionProfileContext.Provider value={value}>{children}</SessionProfileContext.Provider>;
}

export { SessionProfileProviderImpl as SessionProfileProvider };

export const useSessionApiReady = () => {
  return useContext(SessionProfileContext);
};
