import { useAuthCallback } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import {useAuth, useUser} from "@clerk/expo"

const AuthSync = () => {
    const {isSignedIn} = useAuth();
    const {user} = useUser();
    const {mutate: syncUser} = useAuthCallback();
    const hasSynced = useRef(false);

    useEffect(() => {
        if(isSignedIn && user && !hasSynced.current) {
            hasSynced.current = true;
            syncUser(undefined, {
                onSuccess: (data) => {
                    console.log("User synced successfully");
                },
                onError: (error) => {
                    console.error("Failed to sync user", error.message);
                }
            })
        }
        if(!isSignedIn) {
            hasSynced.current = false;
        }
    },[isSignedIn, user, syncUser])
    return null;
}
export default AuthSync;