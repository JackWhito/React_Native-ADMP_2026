import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useJoinServerByInvite } from "@/hooks/useServer";

export default function InviteCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const rawCode = params.code;
  const inviteCode = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim() ?? "";
  const { mutateAsync } = useJoinServerByInvite();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!inviteCode) {
        Alert.alert("Invalid invite", "Invite code is missing.");
        if (!cancelled) router.replace("/(tabs)");
        return;
      }
      try {
        const result = await mutateAsync(inviteCode);
        if (!cancelled) {
          Alert.alert(
            "Invite accepted",
            result.joined
              ? `You joined ${result.serverName}.`
              : `You are already in ${result.serverName}.`
          );
          router.replace("/(tabs)");
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.error ??
          error?.message ??
          "Could not join server from this invite.";
        if (!cancelled) {
          Alert.alert("Invite failed", String(message));
          router.replace("/(tabs)");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [inviteCode, mutateAsync, router]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="large" color="#a1a1aa" />
        <Text className="text-zinc-200 mt-4 text-base font-semibold">Processing invite...</Text>
        <Text className="text-zinc-400 mt-1 text-sm text-center">
          Joining server from invite link.
        </Text>
      </View>
    </SafeAreaView>
  );
}
