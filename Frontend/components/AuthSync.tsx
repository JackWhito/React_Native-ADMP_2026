import { useAuthCallback } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/expo";

const AuthSync = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { mutateAsync: syncUser } = useAuthCallback();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user && !hasSynced.current) {
      hasSynced.current = true;
      syncUser().catch(() => {});
    }
    if (!isSignedIn) {
      hasSynced.current = false;
    }
  }, [isLoaded, isSignedIn, user, syncUser]);

  return null;
};

export default AuthSync;