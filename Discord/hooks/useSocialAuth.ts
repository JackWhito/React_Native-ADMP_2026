import { useSSO } from "@clerk/expo";
import { router } from "expo-router";
import {useState} from "react";
import { Alert } from "react-native";
import * as AuthSession from "expo-auth-session";

function useAuthSocial() {
    const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
    const { startSSOFlow } = useSSO();

    const handleSocialAuth = async (strategy:"oauth_google") => {
        setLoadingStrategy(strategy);

        try {
            const redirectUrl = AuthSession.makeRedirectUri();
            const { createdSessionId, setActive } = await startSSOFlow({strategy, redirectUrl});
            if(createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
            } else if (!createdSessionId) {
            }        
        } catch (error) {
            console.error("Social auth error:", error);
            const provider = strategy === "oauth_google" ? "Google" : "Unknown";
            Alert.alert("Error", `Failed to authenticate with ${provider}. Please try again.`);
        } finally {
            setLoadingStrategy(null);
        }
    }

    return { handleSocialAuth, loadingStrategy };
}

export default useAuthSocial;