import { useSSO } from "@clerk/expo";
import { useState } from "react";
import { Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import { useLocalAuth } from "@/contexts/LocalAuthContext";

function useAuthSocial() {
  const { signOutLocal } = useLocalAuth();
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
  const { startSSOFlow } = useSSO();

  const handleSocialAuth = async (strategy: "oauth_google") => {
    setLoadingStrategy(strategy);

    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      const { createdSessionId, setActive } = await startSSOFlow({ strategy, redirectUrl });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await signOutLocal();
      }
    } catch {
      Alert.alert("Error", "Failed to authenticate with Google. Please try again.");
    } finally {
      setLoadingStrategy(null);
    }
  };

  return { handleSocialAuth, loadingStrategy };
}

export default useAuthSocial;