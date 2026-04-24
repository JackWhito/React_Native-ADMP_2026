import { Stack } from "expo-router";
import "@/global.css";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"
import { LocalAuthProvider, useLocalAuth } from "@/contexts/LocalAuthContext";
import { SessionProfileProvider, useSessionApiReady } from "@/contexts/SessionProfileContext";
import AuthSync from "@/components/AuthSync";
import AppBootstrapSplash from "@/components/AppBootstrapSplash";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { useChat } from "@/hooks/useChat";
import { useServers } from "@/hooks/useServer";
import { tokenCache } from '@clerk/expo/token-cache';
import {PortalHost} from '@rn-primitives/portal'
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetch churn across tabs and modal mounts.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file')
}

function AppShell() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLocalAuthed, isHydrated: localReady } = useLocalAuth();
  const { isApiReady, isError: sessionBootstrapError } = useSessionApiReady();
  const [showSplash, setShowSplash] = useState(true);
  const isAuthed = isLocalAuthed || isSignedIn;
  const shouldLoadBootstrapData = !!(isLoaded && localReady && isAuthed && isApiReady);
  const serversQuery = useServers({ enabled: shouldLoadBootstrapData });
  const conversationsQuery = useChat({ enabled: shouldLoadBootstrapData });

  useEffect(() => {
    if (!isLoaded) {
      setShowSplash(true);
      return;
    }

    if (!isLocalAuthed && !isSignedIn) {
      setShowSplash(false);
      return;
    }

    if (sessionBootstrapError) {
      setShowSplash(false);
      return;
    }

    const waitingServers = serversQuery.isLoading || serversQuery.isPending;
    const waitingConversations =
      conversationsQuery.isLoading || conversationsQuery.isPending;

    if (waitingServers || waitingConversations) {
      setShowSplash(true);
      return;
    }

    const serversReady = serversQuery.isFetched || serversQuery.isError;
    const conversationsReady =
      conversationsQuery.isFetched || conversationsQuery.isError;

    setShowSplash(!(serversReady && conversationsReady));
  }, [
    isLoaded,
    isLocalAuthed,
    isSignedIn,
    isApiReady,
    sessionBootstrapError,
    serversQuery.isLoading,
    serversQuery.isPending,
    serversQuery.isFetched,
    serversQuery.isError,
    conversationsQuery.isLoading,
    conversationsQuery.isPending,
    conversationsQuery.isFetched,
    conversationsQuery.isError,
  ]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthSync />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#0D0D0F" },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="profile/edit"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="profile/friends"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="profile/account-settings"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="server/[id]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="server/create-category"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="server/create-channel"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="server/edit-category"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="invite/[code]"
          options={{ animation: "fade" }}
        />
        <Stack.Screen
          name="friends/add"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="channel-info/[id]"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
      <PortalHost />
      {showSplash ? (
        <AppBootstrapSplash />
      ) : null}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
    <QueryClientProvider client={queryClient}>
          <LocalAuthProvider>
            <SessionProfileProvider>
              <AppShell />
            </SessionProfileProvider>
          </LocalAuthProvider>
    </QueryClientProvider>
    </ClerkProvider>
  );
}
