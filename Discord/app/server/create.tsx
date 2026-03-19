import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreateServer } from "@/hooks/useServer";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateServerScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const createServer = useCreateServer();

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70">
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Create server</Text>
      </View>

      <View className="px-4 py-4 gap-3">
        <View>
          <Text className="text-zinc-300 text-sm mb-2">Server name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. My Study Group"
            placeholderTextColor="#71717a"
            className="bg-zinc-800 text-white px-4 py-3 rounded-xl"
            autoCapitalize="words"
          />
        </View>

        <View>
          <Text className="text-zinc-300 text-sm mb-2">Image URL (optional)</Text>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            placeholderTextColor="#71717a"
            className="bg-zinc-800 text-white px-4 py-3 rounded-xl"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {createServer.isError ? (
          <Text className="text-red-400 text-sm">
            Failed to create server. Check backend logs and API URL.
          </Text>
        ) : null}

        <Pressable
          disabled={!canSubmit || createServer.isPending}
          onPress={() =>
            createServer.mutate(
              { name: name.trim(), imageUrl: imageUrl.trim() },
              {
                onSuccess: (server) => {
                  router.replace({
                    pathname: "/server/[id]",
                    params: { id: server._id, name: server.name, imageUrl: server.imageUrl },
                  });
                },
              }
            )
          }
          className={`mt-2 rounded-xl px-4 py-3 items-center ${
            !canSubmit || createServer.isPending ? "bg-zinc-700" : "bg-green-600"
          }`}
        >
          {createServer.isPending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-semibold">Create</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

