import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCreateServerCategory } from "@/hooks/useServer";

export default function CreateCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    serverId?: string | string[];
    serverName?: string | string[];
  }>();
  const rawServerId = params.serverId;
  const serverId = Array.isArray(rawServerId) ? rawServerId[0] : rawServerId;
  const [categoryName, setCategoryName] = useState("");
  const { mutateAsync, isPending } = useCreateServerCategory();

  const serverName = useMemo(() => {
    const raw = params.serverName;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.trim() || "Server";
  }, [params.serverName]);

  const canCreate = !!serverId && categoryName.trim().length > 0 && !isPending;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      await mutateAsync({ serverId: String(serverId), name: categoryName.trim() });
      Alert.alert("Category created", `Created "${categoryName.trim()}" successfully.`);
      router.back();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        "Could not create category. Please try again.";
      Alert.alert("Create category failed", String(message));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Create category</Text>
      </View>

      <View className="px-4 py-5">
        <Text className="text-zinc-400 text-xs mb-2">SERVER</Text>
        <Text className="text-zinc-200 text-sm mb-5" numberOfLines={1}>
          {serverName}
        </Text>

        <Text className="text-zinc-400 text-xs mb-2">CATEGORY NAME</Text>
        <TextInput
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="New Category"
          placeholderTextColor="#71717a"
          autoCapitalize="words"
          autoCorrect={false}
          className="bg-zinc-800 text-white rounded-md px-3 py-3"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          className={`mt-6 rounded-md px-4 py-3 ${canCreate ? "bg-indigo-500" : "bg-zinc-700"}`}
        >
          <Text className="text-white text-center font-semibold">
            {isPending ? "Creating..." : "Create category"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
