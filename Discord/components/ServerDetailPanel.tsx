import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import type { Server } from "@/types";
import { Ionicons } from "@expo/vector-icons";

export default function ServerDetailPanel({
  server,
  onBackToChats,
}: {
  server: Server;
  onBackToChats: () => void;
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={onBackToChats} className="mr-3 active:opacity-70">
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        {server.imageUrl ? (
          <Image
            source={{ uri: server.imageUrl }}
            style={{ width: 28, height: 28, borderRadius: 999, marginRight: 10, backgroundColor: "#27272a" }}
          />
        ) : null}
        <View className="flex-1">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            {server.name}
          </Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>
            {server._id}
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-zinc-300 text-sm">Server detail panel (inline).</Text>
      </View>
    </View>
  );
}

