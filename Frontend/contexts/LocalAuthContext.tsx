import { useQueryClient } from "@tanstack/react-query";
import { useClerk, useAuth } from "@clerk/expo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/axios";
import { APP_JWT_STORE_KEY } from "@/lib/appJwtStorageKey";
import * as SecureStore from "expo-secure-store";

type LocalAuthContextValue = {
  accessToken: string | null;
  isHydrated: boolean;
  isLocalAuthed: boolean;
  getLocalAccessToken: () => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  startEmailRegistration: (input: { email: string; password: string; name: string }) => Promise<void>;
  verifyEmailRegistration: (email: string, otp: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  /** After email change or password change, save new app JWT and keep session. */
  persistAppAccessToken: (token: string) => Promise<void>;
  completePasswordReset: (input: { email: string; otp: string; newPassword: string }) => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const LocalAuthContext = createContext<LocalAuthContextValue | null>(null);

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await SecureStore.getItemAsync(APP_JWT_STORE_KEY);
        if (!cancelled) setAccessToken(t);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getLocalAccessToken = useCallback(async () => {
    if (accessToken) return accessToken;
    const t = await SecureStore.getItemAsync(APP_JWT_STORE_KEY);
    if (t) setAccessToken(t);
    return t;
  }, [accessToken]);

  const signOutLocal = useCallback(async () => {
    await SecureStore.deleteItemAsync(APP_JWT_STORE_KEY);
    setAccessToken(null);
    queryClient.clear();
  }, [queryClient]);

  const persistAppAccessToken = useCallback(
    async (token: string) => {
      await SecureStore.setItemAsync(APP_JWT_STORE_KEY, token);
      setAccessToken(token);
    },
    []
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await api.post("auth/local/forgot-password", { email: email.trim().toLowerCase() });
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<{ accessToken: string }>("auth/local/login", { email, password });
      if (!data?.accessToken) throw new Error("No token");
      if (isSignedIn) {
        await signOut();
      }
      await SecureStore.setItemAsync(APP_JWT_STORE_KEY, data.accessToken);
      setAccessToken(data.accessToken);
      queryClient.clear();
    },
    [isSignedIn, queryClient, signOut]
  );

  const startEmailRegistration = useCallback(async (input: { email: string; password: string; name: string }) => {
    await api.post("auth/local/register-start", {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      name: input.name.trim(),
    });
  }, []);

  const verifyEmailRegistration = useCallback(
    async (email: string, otp: string) => {
      const { data } = await api.post<{ accessToken: string }>("auth/local/register-verify", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (!data?.accessToken) throw new Error("No token");
      if (isSignedIn) {
        await signOut();
      }
      await SecureStore.setItemAsync(APP_JWT_STORE_KEY, data.accessToken);
      setAccessToken(data.accessToken);
      queryClient.clear();
    },
    [isSignedIn, queryClient, signOut]
  );

  const completePasswordReset = useCallback(
    async (input: { email: string; otp: string; newPassword: string }) => {
      const { data } = await api.post<{ accessToken: string }>("auth/local/reset-password", input);
      if (!data?.accessToken) throw new Error("No token");
      if (isSignedIn) {
        await signOut();
      }
      await SecureStore.setItemAsync(APP_JWT_STORE_KEY, data.accessToken);
      setAccessToken(data.accessToken);
      queryClient.clear();
    },
    [isSignedIn, queryClient, signOut]
  );

  const value = useMemo<LocalAuthContextValue>(
    () => ({
      accessToken,
      isHydrated,
      isLocalAuthed: Boolean(accessToken),
      getLocalAccessToken,
      signInWithPassword,
      startEmailRegistration,
      verifyEmailRegistration,
      requestPasswordReset,
      persistAppAccessToken,
      completePasswordReset,
      signOutLocal,
    }),
    [
      accessToken,
      isHydrated,
      getLocalAccessToken,
      signInWithPassword,
      startEmailRegistration,
      verifyEmailRegistration,
      requestPasswordReset,
      persistAppAccessToken,
      completePasswordReset,
      signOutLocal,
    ]
  );

  return <LocalAuthContext.Provider value={value}>{children}</LocalAuthContext.Provider>;
}

export function useLocalAuth() {
  const v = useContext(LocalAuthContext);
  if (!v) throw new Error("useLocalAuth must be used within LocalAuthProvider");
  return v;
}
