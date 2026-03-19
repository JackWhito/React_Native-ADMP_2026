import React from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();

  return (
    <View className="flex-1 bg-zinc-900">
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70">
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            {params?.name || "Chat"}
          </Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>
            {params?.id ? `Conversation: ${params.id}` : ""}
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-zinc-300 text-sm">
          Chat details screen (messages endpoint not wired yet).
        </Text>
      </View>
    </View>
  );
}

