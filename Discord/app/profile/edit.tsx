import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70">
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Update profile</Text>
      </View>
      <View className="px-4 py-6 gap-2">
        <Text className="text-zinc-400 text-sm">
          Signed in as{" "}
          <Text className="text-foreground">
            {user?.primaryEmailAddress?.emailAddress ?? user?.username ?? "—"}
          </Text>
        </Text>
        <Text className="text-zinc-500 text-xs mt-2">
          Avatar and name are managed by your Clerk account. Connect the Clerk User Profile UI
          here when you want in-app editing.
        </Text>
      </View>
    </SafeAreaView>
  );
}
