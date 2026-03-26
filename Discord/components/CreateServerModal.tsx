import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateServer } from "@/hooks/useServer";

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
