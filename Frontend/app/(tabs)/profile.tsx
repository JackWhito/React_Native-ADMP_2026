import { View, Text, Image, TouchableOpacity, Modal, Pressable, ActivityIndicator, Alert } from "react-native";
import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { remoteImageSource } from "@/lib/utils";
import * as ImagePicker from "expo-image-picker";
import { useChat } from "@/hooks/useChat";
import { useMyProfile, useUpdateMyAvatar } from "@/hooks/useProfile";
import { useAuthCallback } from "@/hooks/useAuth";
import type { Chat } from "@/types";

export default function Profile() {
  const { top } = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { data: conversations } = useChat();
  const { data: myProfile } = useMyProfile();
  const updateMyAvatar = useUpdateMyAvatar();
  const syncAuth = useAuthCallback();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);

  const displayName =
    myProfile?.name?.trim() ||
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    (isLoaded ? "User" : "…");

  const resolvedAvatarUrl = (myProfile?.imageUrl?.trim() || user?.imageUrl?.trim() || "").trim();
  const isLocalEmailAccount = myProfile?.authProvider === "email";
  const avatarSrc = remoteImageSource(resolvedAvatarUrl);
  const canRemoveAvatar = useMemo(() => Boolean(resolvedAvatarUrl), [resolvedAvatarUrl]);
  const joinedSinceLabel = useMemo(() => {
    if (!user?.createdAt) return "Unknown";
    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [user?.createdAt]);
  const friendCount = conversations?.length ?? 0;

  const openAccountSettings = () => {
    router.push("/profile/account-settings");
  };

  const handleUpdate = () => {
    router.push("/profile/edit");
  };

  const refreshAvatarState = async () => {
    if (user?.id) {
      try {
        await syncAuth.mutateAsync();
      } catch {
        // Local email auth has no Clerk callback to sync.
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });

    const latestImageUrl = String((user as any)?.imageUrl ?? "").trim();
    const myId = String(myProfile?._id ?? "").trim();
    queryClient.setQueryData<Chat[]>(["conversations"], (current) => {
      if (!Array.isArray(current) || !current.length) return current;
      return current.map((item) => {
        const isMe = Boolean(myId) && String(item.member?._id ?? "") === myId;
        if (!isMe) return item;
        return {
          ...item,
          member: {
            ...item.member,
            imageUrl: latestImageUrl,
          },
        };
      });
    });
  };

  const pushAvatarToBackend = async (imageUrl: string) => {
    await updateMyAvatar.mutateAsync({ imageUrl: imageUrl.trim() });
  };

  const handlePickAvatar = async () => {
    if (avatarPending) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: isLocalEmailAccount ? 0.35 : 0.8,
        base64: isLocalEmailAccount,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setAvatarPending(true);
      const setProfileImage = (user as any)?.setProfileImage;
      if (user && typeof setProfileImage === "function") {
        await setProfileImage.call(user, {
          file: {
            uri: asset.uri,
            name: asset.fileName || `avatar-${Date.now()}.jpg`,
            type: asset.mimeType || "image/jpeg",
          },
        });
        const reload = (user as any)?.reload;
        if (typeof reload === "function") {
          await reload.call(user);
        }
        await syncAuth.mutateAsync();
        const clerkImageUrl = String((user as any)?.imageUrl ?? "").trim();
        await pushAvatarToBackend(clerkImageUrl);
      } else {
        if (!asset?.base64) {
          Alert.alert("Avatar update", "Could not read image data. Please try another image.");
          return;
        }
        if (asset.base64.length > 2_000_000) {
          Alert.alert(
            "Image too large",
            "Please pick a smaller image. For best results, use a square image under 2MB."
          );
          return;
        }
        const mime = asset.mimeType || "image/jpeg";
        await pushAvatarToBackend(`data:${mime};base64,${asset.base64}`);
      }
      await refreshAvatarState();
      setAvatarModalOpen(false);
    } catch (error: any) {
      const apiError =
        error?.response?.data?.error || error?.message || "Could not update avatar. Please try again.";
      Alert.alert("Avatar update failed", String(apiError));
    } finally {
      setAvatarPending(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (avatarPending) return;
    try {
      setAvatarPending(true);
      const deleteProfileImage = (user as any)?.deleteProfileImage;
      if (user && typeof deleteProfileImage === "function") {
        await deleteProfileImage.call(user);
      }
      await pushAvatarToBackend("");
      await refreshAvatarState();
      setAvatarModalOpen(false);
    } finally {
      setAvatarPending(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-900" style={{ paddingTop: top }}>
      {/* ---------- NAV BAR (matches BaiTap ProfileScreen) ---------- */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-white text-lg font-semibold" />

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
            onPress={openAccountSettings}
            accessibilityRole="button"
            accessibilityLabel="Open account settings"
          >
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- PROFILE HEADER ---------- */}
      <View className="flex-row items-center px-4 mt-6">
        <TouchableOpacity
          className="w-[80px] h-[80px] rounded-full bg-zinc-700 items-center justify-center overflow-hidden"
          activeOpacity={0.8}
          onPress={() => setAvatarModalOpen(true)}
        >
          {avatarSrc ? (
            <Image source={avatarSrc} style={{ width: 75, height: 75, borderRadius: 999 }} />
          ) : (
            <Ionicons name="person" size={50} color="#d4d4d8" />
          )}
        </TouchableOpacity>

        <View className="flex-1 ml-4 pt-4">
          <TouchableOpacity
            className="mt-2 w-full h-[40px] rounded-full bg-zinc-800 flex-row items-center justify-start pl-3 gap-2"
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" color="#9ca3af" size={20} />
            <Text className="text-gray-400 text-sm italic text-[15px]">What are you thinking?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- ACCOUNT INFO ---------- */}
      <View className="flex-col">
        <Text className="text-white pl-5 pt-3 text-[25px]">{displayName}</Text>
        {(myProfile?.email || user?.primaryEmailAddress?.emailAddress) ? (
          <Text className="text-zinc-500 pl-5 pt-1 text-sm">
            {myProfile?.email || user?.primaryEmailAddress?.emailAddress}
          </Text>
        ) : null}
      </View>

      <View className="pt-[10px] flex-col items-center justify-center px-4">
        <TouchableOpacity
          className="w-full max-w-[92%] h-[40px] rounded-full bg-primary flex-row items-center justify-center pl-3 gap-2"
          onPress={handleUpdate}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" color="white" size={25} />
          <Text className="text-white text-sm italic text-[15px]">Update Profile</Text>
        </TouchableOpacity>
        <View className="w-full max-w-[92%] mt-4 gap-3">
          <View className="rounded-3xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3">
            <Text className="text-zinc-400 text-xs mb-1">Joined since</Text>
            <Text className="text-zinc-100 text-base font-semibold">{joinedSinceLabel}</Text>
          </View>
          <TouchableOpacity
            className="rounded-3xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 active:opacity-75"
            onPress={() => router.push("/profile/friends")}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-zinc-400 text-xs mb-1">Friend list</Text>
                <Text className="text-zinc-100 text-base font-semibold">
                  {friendCount} {friendCount === 1 ? "friend" : "friends"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={avatarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !avatarPending && setAvatarModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => !avatarPending && setAvatarModalOpen(false)}
        >
          <Pressable className="w-full max-w-[360px] rounded-2xl bg-[#15161A] border border-zinc-800 px-4 pt-3 pb-4">
            <Text className="text-zinc-200 text-sm font-semibold mb-1">Avatar options</Text>
            <Text className="text-zinc-400 text-xs mb-3">Update your profile picture</Text>
            <Pressable
              onPress={handlePickAvatar}
              disabled={avatarPending}
              className={`py-3 rounded-md ${avatarPending ? "opacity-60" : "active:bg-zinc-800/70"}`}
            >
              <Text className="text-zinc-100 text-sm">Change avatar</Text>
            </Pressable>
            <Pressable
              onPress={handleRemoveAvatar}
              disabled={avatarPending || !canRemoveAvatar}
              className={`py-3 rounded-md ${
                avatarPending || !canRemoveAvatar ? "opacity-40" : "active:bg-red-500/10"
              }`}
            >
              <Text className="text-red-400 text-sm">Remove avatar</Text>
            </Pressable>
            <Pressable
              onPress={() => setAvatarModalOpen(false)}
              disabled={avatarPending}
              className={`py-3 rounded-md ${avatarPending ? "opacity-40" : "active:bg-zinc-800/70"}`}
            >
              {avatarPending ? (
                <ActivityIndicator color="#A1A1AA" size="small" />
              ) : (
                <Text className="text-zinc-100 text-sm">Cancel</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
