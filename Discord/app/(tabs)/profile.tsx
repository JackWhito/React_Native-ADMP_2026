import { View, Text, Image, TouchableOpacity } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { remoteImageSource } from "@/lib/utils";

export default function Profile() {
  const { top } = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    (isLoaded ? "User" : "…");

  const avatarSrc = remoteImageSource(user?.imageUrl);

  const handleSignOut = () => {
    signOut();
  };

  const handleUpdate = () => {
    router.push("/profile/edit");
  };

  return (
    <View className="flex-1 bg-zinc-900" style={{ paddingTop: top }}>
      {/* ---------- NAV BAR (matches BaiTap ProfileScreen) ---------- */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-white text-lg font-semibold" />

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- PROFILE HEADER ---------- */}
      <View className="flex-row items-center px-4 mt-6">
        <TouchableOpacity
          className="w-[80px] h-[80px] rounded-full bg-zinc-700 items-center justify-center overflow-hidden"
          activeOpacity={0.8}
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
        {user?.primaryEmailAddress?.emailAddress ? (
          <Text className="text-zinc-500 pl-5 pt-1 text-sm">
            {user.primaryEmailAddress.emailAddress}
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
      </View>
    </View>
  );
}
