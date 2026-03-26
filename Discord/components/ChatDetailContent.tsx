import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ChatDetailTarget =
  | { kind: "dm"; id: string; name: string; imageUrl?: string }
  | {
      kind: "channel";
      id: string;
      channelName: string;
      serverId: string;
      serverName: string;
    };

export function ChatDetailContent({
  target,
  onClose,
  closeIcon = "chevron-down",
}: {
  target: ChatDetailTarget;
  onClose: () => void;
  closeIcon?: "chevron-down" | "chevron-back";
}) {
  const isChannel = target.kind === "channel";
  const title =
    target.kind === "channel" ? `#${target.channelName}` : target.name;
  const subtitle =
    target.kind === "channel"
      ? `${target.serverName} · text channel`
      : target.id
        ? `Conversation · ${target.id}`
        : "";

  return (
    <View className="flex-1">
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={onClose} className="mr-3 active:opacity-70" hitSlop={8}>
          <Ionicons name={closeIcon} size={22} color="white" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-zinc-300 text-sm text-center">
          {isChannel
            ? "Channel messages are not wired to the API yet."
            : "Direct messages screen (messages endpoint not wired yet)."}
        </Text>
      </View>
    </View>
  );
}
