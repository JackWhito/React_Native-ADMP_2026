import { Stack } from "expo-router";
import "@/global.css";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"
import { View } from "react-native";
import AuthSync from "@/components/AuthSync";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from '@clerk/expo/token-cache';
import {PortalHost} from '@rn-primitives/portal'
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file')
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
    <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 flex-row">
              <AuthSync />
              <View className="flex-1">
                <Stack screenOptions={{ headerShown: false, contentStyle: {backgroundColor:"#0D0D0F"} }}>
                  <Stack.Screen name="(auth)" options={{animation:"fade"}} />
                  <Stack.Screen name="(tabs)" options={{animation:"fade"}} />
                  <Stack.Screen
                    name="server/create"
                    options={{ presentation: "modal", animation: "slide_from_bottom" }}
                  />
                </Stack>
                <PortalHost />
              </View>
            </View>
          </GestureHandlerRootView>
    </QueryClientProvider>
    </ClerkProvider>
  );
}
