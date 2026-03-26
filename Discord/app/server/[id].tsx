import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import ServerChannelsBody from "@/components/ServerChannelsBody";

export default function ServerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();
  const raw = params.id;
  const serverId = Array.isArray(raw) ? raw[0] : raw;
  const rawName = params.name;
  const serverName =
    (Array.isArray(rawName) ? rawName[0] : rawName)?.trim() || "Server";

  if (!serverId) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <ServerChannelsBody
        serverId={serverId}
        serverName={serverName}
        onBack={() => router.back()}
      />
    </SafeAreaView>
  );
}
