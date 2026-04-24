import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/expo";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

const AuthSync = () => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isHydrated: localReady, isLocalAuthed } = useLocalAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded || !localReady) return;
    const isAuthed = isLocalAuthed || isSignedIn;
    if (!isAuthed) {
      queryClient.clear();
      previousUserId.current = null;
      return;
    }
    if (isSignedIn && userId) {
      if (previousUserId.current && previousUserId.current !== userId) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    }
  }, [isLoaded, localReady, isLocalAuthed, isSignedIn, userId, queryClient]);

  return null;
};

export default AuthSync;
