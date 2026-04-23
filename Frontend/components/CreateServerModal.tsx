import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateServer } from "@/hooks/useServer";
import * as ImagePicker from "expo-image-picker";

export default function CreateServerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const createServer = useCreateServer();

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  useEffect(() => {
    if (!visible) {
      setName("");
      setImageUrl("");
    }
  }, [visible]);

  const handleClose = () => {
    if (createServer.isPending) return;
    onClose();
  };

  const handlePickImage = async () => {
    if (createServer.isPending) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.75,
        base64: true,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      if (asset.base64) {
        const mimeType = asset.mimeType || "image/jpeg";
        setImageUrl(`data:${mimeType};base64,${asset.base64}`);
        return;
      }

      if (asset.uri) {
        setImageUrl(asset.uri);
      }
    } catch {
      // Keep existing error UI behavior on submit.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1">
        <View className="flex-1 justify-end bg-black/50">
          <Pressable className="flex-1" onPress={handleClose} accessibilityLabel="Dismiss" />
          <SafeAreaView
            edges={["bottom"]}
            className="bg-zinc-900 rounded-t-3xl border-t border-zinc-800"
          >
            <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
              <Pressable onPress={handleClose} className="mr-3 p-1 active:opacity-70" hitSlop={8}>
                <Ionicons name="chevron-down" size={22} color="white" />
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
                <Text className="text-zinc-300 text-sm mb-2">Server image (optional)</Text>
                {imageUrl ? (
                  <View className="mb-2">
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 92, height: 92, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
                <View className="flex-row items-center">
                  <Pressable
                    onPress={handlePickImage}
                    disabled={createServer.isPending}
                    className="rounded-xl bg-zinc-800 px-4 py-3 active:opacity-70"
                  >
                    <Text className="text-zinc-100 font-medium">
                      {imageUrl ? "Change image" : "Pick image"}
                    </Text>
                  </Pressable>
                  {imageUrl ? (
                    <Pressable
                      onPress={() => setImageUrl("")}
                      disabled={createServer.isPending}
                      className="ml-2 rounded-xl bg-zinc-800 px-3 py-3 active:opacity-70"
                    >
                      <Ionicons name="trash-outline" size={16} color="#F87171" />
                    </Pressable>
                  ) : null}
                </View>
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
                      onSuccess: async () => {
                        await queryClient.refetchQueries({ queryKey: ["servers"] });
                        onClose();
                      },
                    }
                  )
                }
                className={`mt-2 rounded-xl px-4 py-3 items-center ${
                  !canSubmit || createServer.isPending ? "bg-zinc-700" : "bg-green-600"
                }`}
              >
                {createServer.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Create</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
