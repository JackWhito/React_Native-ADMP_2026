import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChatDetailContent,
  type ChatDetailTarget,
} from "@/components/ChatDetailContent";

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    scope?: string | string[];
    serverId?: string | string[];
    serverName?: string | string[];
    imageUrl?: string | string[];
  }>();

  const target = useMemo((): ChatDetailTarget | null => {
    const rawId = params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return null;

    const rawName = params.name;
    const name = (Array.isArray(rawName) ? rawName[0] : rawName) || "Chat";
    const rawScope = params.scope;
    const scope = Array.isArray(rawScope) ? rawScope[0] : rawScope;

    if (scope === "channel") {
      const rawSid = params.serverId;
      const rawSname = params.serverName;
      const serverId = Array.isArray(rawSid) ? rawSid[0] : rawSid;
      const serverName = Array.isArray(rawSname) ? rawSname[0] : rawSname;
      if (!serverId || !serverName) return null;
      const channelName = name.startsWith("#") ? name.slice(1) : name;
      return {
        kind: "channel",
        id,
        channelName,
        serverId,
        serverName,
      };
    }

    const rawImg = params.imageUrl;
    const imageUrl = Array.isArray(rawImg) ? rawImg[0] : rawImg;

    return {
      kind: "dm",
      id,
      name,
      imageUrl: imageUrl || undefined,
    };
  }, [params]);

  if (!target) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <ChatDetailContent
        target={target}
        onClose={() => router.back()}
        closeIcon="chevron-back"
      />
    </SafeAreaView>
  );
}
