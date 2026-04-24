import { useAuth } from "@clerk/expo";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

/**
 * Logged in via Clerk (e.g. Google) or our email/password (SecureStore JWT).
 */
export function useAppAuthed() {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isLocalAuthed, isHydrated: localHydrated } = useLocalAuth();
  return {
    isAuthLoaded: Boolean(clerkLoaded && localHydrated),
    isAuthed: isLocalAuthed || isSignedIn,
  };
}
