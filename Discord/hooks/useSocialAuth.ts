import { useSSO } from "@clerk/expo";
import {useState} from "react";
import { Alert } from "react-native";

function useAuthSocial() {
    const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
    const { startSSOFlow } = useSSO();

    const handleSocialAuth = async (strategy:"oauth_google") => {
        setLoadingStrategy(strategy);

        try {
            const { createdSessionId, setActive } = await startSSOFlow({strategy});
            if(createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
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