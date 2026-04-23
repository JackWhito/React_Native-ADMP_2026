import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  useAddFriendByLink,
  useAddFriendByName,
  useFriendInviteLink,
  useSearchProfiles,
} from "@/hooks/useFriend";
import AppDialogModal from "@/components/modals/AppDialogModal";

type Mode = "link" | "search";

export default function AddFriendScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("link");
  const [linkOrCode, setLinkOrCode] = useState("");
  const [searchText, setSearchText] = useState("");
  const [messageModal, setMessageModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: "",
    message: "",
  });
  const [closeToBack, setCloseToBack] = useState(false);

  const { data: inviteLinkData, isLoading: inviteLoading } = useFriendInviteLink();
  const { data: searchResults, isLoading: searching } = useSearchProfiles(searchText);
  const addByLink = useAddFriendByLink();
  const addByName = useAddFriendByName();

  const handleCopyMyLink = async () => {
    const link = inviteLinkData?.link;
    if (!link) {
      setMessageModal({
        open: true,
        title: "Unavailable",
        message: "Your friend link is still loading.",
      });
      setCloseToBack(false);
      return;
    }
    await Clipboard.setStringAsync(link);
    setMessageModal({
      open: true,
      title: "Copied",
      message: "Your friend invite link is copied.",
    });
    setCloseToBack(false);
  };

  const handleAddByLink = async () => {
    const value = linkOrCode.trim();
    if (!value) return;
    try {
      await addByLink.mutateAsync(value);
      setMessageModal({
        open: true,
        title: "Invite sent",
        message: "Your friend invite has been sent.",
      });
      setCloseToBack(true);
      setLinkOrCode("");
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Could not add friend.";
      setMessageModal({
        open: true,
        title: "Add friend failed",
        message: String(message),
      });
      setCloseToBack(false);
    }
  };

  const handleAddByName = async (username?: string) => {
    const value = (username ?? "").trim();
    if (!value) return;
    try {
      await addByName.mutateAsync(value);
      setMessageModal({
        open: true,
        title: "Invite sent",
        message: "Your friend invite has been sent.",
      });
      setCloseToBack(true);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Could not add friend.";
      setMessageModal({
        open: true,
        title: "Add friend failed",
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
        <Text className="text-white text-base font-semibold">Add Friends</Text>
      </View>

      <View className="px-4 py-4 flex-row gap-2">
        <Pressable
          onPress={() => setMode("link")}
          className={`flex-1 px-3 py-2.5 rounded-md border ${
            mode === "link" ? "bg-indigo-500/20 border-indigo-400" : "bg-zinc-800 border-zinc-700"
          }`}
        >
          <Text className={mode === "link" ? "text-indigo-200 text-center font-semibold" : "text-zinc-200 text-center"}>
            Add by link
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("search")}
          className={`flex-1 px-3 py-2.5 rounded-md border ${
            mode === "search" ? "bg-indigo-500/20 border-indigo-400" : "bg-zinc-800 border-zinc-700"
          }`}
        >
          <Text className={mode === "search" ? "text-indigo-200 text-center font-semibold" : "text-zinc-200 text-center"}>
            Search by name
          </Text>
        </Pressable>
      </View>

      {mode === "link" ? (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Text className="text-zinc-400 text-xs mb-2">YOUR FRIEND LINK</Text>
          <View className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 mb-2">
            <Text className="text-zinc-200 text-[13px]" numberOfLines={2}>
              {inviteLoading ? "Loading..." : inviteLinkData?.link ?? "Unavailable"}
            </Text>
          </View>
          <Pressable
            onPress={handleCopyMyLink}
            className="rounded-md px-4 py-3 bg-zinc-800 border border-zinc-700 mb-6"
          >
            <Text className="text-zinc-200 text-center font-semibold">Copy my link</Text>
          </Pressable>

          <Text className="text-zinc-400 text-xs mb-2">ADD FRIEND BY LINK OR CODE</Text>
          <TextInput
            value={linkOrCode}
            onChangeText={setLinkOrCode}
            placeholder="discord://friend/username or username"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-zinc-800 text-white rounded-md px-3 py-3 mb-4"
          />
          <Pressable
            onPress={handleAddByLink}
            disabled={!linkOrCode.trim() || addByLink.isPending}
            className={`rounded-md px-4 py-3 ${
              linkOrCode.trim() && !addByLink.isPending ? "bg-indigo-500" : "bg-zinc-700"
            }`}
          >
            <Text className="text-white text-center font-semibold">
              {addByLink.isPending ? "Adding..." : "Add friend"}
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View className="flex-1 px-4 pb-4">
          <Text className="text-zinc-400 text-xs mb-2">SEARCH BY NAME OR UNIQUE NAME</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Type name or username"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-zinc-800 text-white rounded-md px-3 py-3 mb-4"
          />

          {searching ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#a1a1aa" />
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {(searchResults ?? []).map((item) => (
                <View
                  key={item._id}
                  className="flex-row items-center justify-between rounded-md bg-zinc-800 border border-zinc-700 px-3 py-3 mb-2"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-zinc-100 font-semibold" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                      @{item.username ?? "unknown"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleAddByName(item.username)}
                    disabled={!item.username || addByName.isPending}
                    className={`px-3 py-2 rounded ${
                      item.username && !addByName.isPending ? "bg-indigo-500" : "bg-zinc-700"
                    }`}
                  >
                    <Text className="text-white text-xs font-semibold">
                      {addByName.isPending ? "Adding..." : "Add"}
                    </Text>
                  </Pressable>
                </View>
              ))}
              {searchText.trim().length > 0 && !(searchResults ?? []).length ? (
                <Text className="text-zinc-400 text-center py-8">No users found.</Text>
              ) : null}
            </ScrollView>
          )}
        </View>
      )}
      <AppDialogModal
        visible={messageModal.open}
        title={messageModal.title}
        message={messageModal.message}
        onClose={closeMessageModal}
      />
    </SafeAreaView>
  );
}
