import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCreateServerChannel, useServerChannelList } from "@/hooks/useServer";
import AppDialogModal from "@/components/modals/AppDialogModal";

export default function CreateChannelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    serverId?: string | string[];
    serverName?: string | string[];
    categoryId?: string | string[];
  }>();
  const rawServerId = params.serverId;
  const serverId = Array.isArray(rawServerId) ? rawServerId[0] : rawServerId;
  const rawServerName = params.serverName;
  const serverName = (Array.isArray(rawServerName) ? rawServerName[0] : rawServerName) || "Server";

  const rawInitialCategoryId = params.categoryId;
  const initialCategoryId = Array.isArray(rawInitialCategoryId)
    ? rawInitialCategoryId[0]
    : rawInitialCategoryId;

  const [channelName, setChannelName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId ?? "");
  const channelType: "text" = "text";
  const [messageModal, setMessageModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [closeToBack, setCloseToBack] = useState(false);

  const { data: channelList, isLoading: categoriesLoading } = useServerChannelList(serverId);
  const { mutateAsync, isPending } = useCreateServerChannel();

  const categories = useMemo(() => channelList?.categories ?? [], [channelList?.categories]);

  const effectiveCategoryId = useMemo(() => {
    if (selectedCategoryId) return selectedCategoryId;
    return categories[0]?._id ?? "";
  }, [selectedCategoryId, categories]);

  const canCreate = !!serverId && !!effectiveCategoryId && channelName.trim().length > 0 && !isPending;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      await mutateAsync({
        serverId: String(serverId),
        name: channelName.trim(),
        categoryId: effectiveCategoryId,
        type: channelType,
      });
      setMessageModal({
        open: true,
        title: "Channel created",
        message: `Created chat channel "${channelName.trim()}" successfully.`,
      });
      setCloseToBack(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        "Could not create channel. Please try again.";
      setMessageModal({
        open: true,
        title: "Create channel failed",
        message: String(message),
      });
      setCloseToBack(false);
    }
  };

  const closeMessageModal = () => {
    setMessageModal((prev) => ({ ...prev, open: false }));
    if (closeToBack) {
      setCloseToBack(false);
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Create channel</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-zinc-400 text-xs mb-2">SERVER</Text>
        <Text className="text-zinc-200 text-sm mb-5" numberOfLines={1}>
          {serverName}
        </Text>

        <Text className="text-zinc-400 text-xs mb-2">CHANNEL NAME</Text>
        <TextInput
          value={channelName}
          onChangeText={setChannelName}
          placeholder="new-channel"
          placeholderTextColor="#71717a"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-zinc-800 text-white rounded-md px-3 py-3 mb-5"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <Text className="text-zinc-400 text-xs mb-2">CATEGORY</Text>
        {categoriesLoading ? (
          <Text className="text-zinc-400 text-sm">Loading categories...</Text>
        ) : categories.length === 0 ? (
          <Text className="text-zinc-400 text-sm">
            No category found. Create a category first.
          </Text>
        ) : (
          <View className="gap-2">
            {categories.map((cat) => {
              const active = cat._id === effectiveCategoryId;
              return (
                <Pressable
                  key={cat._id}
                  onPress={() => setSelectedCategoryId(cat._id)}
                  className={`rounded-md px-3 py-3 border ${
                    active ? "bg-indigo-500/20 border-indigo-400" : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  <Text className={active ? "text-indigo-200 font-semibold" : "text-zinc-200"}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          className={`mt-6 rounded-md px-4 py-3 ${canCreate ? "bg-indigo-500" : "bg-zinc-700"}`}
        >
          <Text className="text-white text-center font-semibold">
            {isPending ? "Creating..." : "Create channel"}
          </Text>
        </Pressable>
      </ScrollView>

      <AppDialogModal
        visible={messageModal.open}
        title={messageModal.title}
        message={messageModal.message}
        onClose={closeMessageModal}
      />
    </SafeAreaView>
  );
}
