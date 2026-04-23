import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMyProfile, useUpdateMyProfile } from "@/hooks/useProfile";

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: myProfile } = useMyProfile();
  const updateMyProfile = useUpdateMyProfile();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  useEffect(() => {
    if (!myProfile) return;
    setName(myProfile.name ?? "");
    setBio(myProfile.bio ?? "");
  }, [myProfile]);

  const originalName = myProfile?.name ?? "";
  const originalBio = myProfile?.bio ?? "";
  const hasChanges = useMemo(() => {
    return name.trim() !== originalName.trim() || bio.trim() !== originalBio.trim();
  }, [name, bio, originalName, originalBio]);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const handleBack = () => {
    if (updateMyProfile.isPending) return;
    if (hasChanges) {
      setConfirmDiscardOpen(true);
      return;
    }
    router.back();
  };

  const handleSave = async () => {
    if (!canSave || !hasChanges || updateMyProfile.isPending) return;
    try {
      await updateMyProfile.mutateAsync({
        name: name.trim(),
        bio: bio.trim(),
      });
      router.back();
    } catch {
      // Error message shown below.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-800">
        <View className="flex-row items-center">
          <Pressable onPress={handleBack} className="mr-3 active:opacity-70">
            <Ionicons name="chevron-back" size={22} color="white" />
          </Pressable>
          <Text className="text-white text-base font-semibold">Update profile</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || !hasChanges || updateMyProfile.isPending}
          className={`${!canSave || !hasChanges || updateMyProfile.isPending ? "opacity-40" : ""}`}
        >
          <Text className="text-indigo-300 text-sm font-semibold">
            {updateMyProfile.isPending ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <View className="px-4 py-5 gap-4">
        <View>
          <Text className="text-zinc-300 text-sm mb-2">Account name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter account name"
            placeholderTextColor="#71717A"
            className="rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100"
            maxLength={60}
          />
        </View>

        <View>
          <Text className="text-zinc-300 text-sm mb-2">Account bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Write something about yourself"
            placeholderTextColor="#71717A"
            className="min-h-[110px] rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100"
            multiline
            textAlignVertical="top"
            maxLength={300}
          />
          <Text className="text-zinc-500 text-xs mt-1 text-right">{bio.length}/300</Text>
        </View>

        {updateMyProfile.isError ? (
          <Text className="text-red-400 text-sm">
            {(updateMyProfile.error as any)?.response?.data?.error ||
              (updateMyProfile.error as Error | undefined)?.message ||
              "Could not save profile changes."}
          </Text>
        ) : null}
      </View>

      <Modal
        visible={confirmDiscardOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDiscardOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setConfirmDiscardOpen(false)}
        >
          <Pressable className="w-full max-w-[360px] rounded-2xl bg-[#15161A] border border-zinc-800 px-4 pt-3 pb-4">
            <Text className="text-zinc-100 text-base font-semibold mb-2">Unsaved changes</Text>
            <Text className="text-zinc-400 text-sm mb-4">
              You have unsaved changes. Do you want to continue editing or discard them?
            </Text>
            <Pressable
              className="py-3 rounded-md active:bg-zinc-800/70"
              onPress={() => setConfirmDiscardOpen(false)}
            >
              <Text className="text-zinc-100 text-sm">Continue editing</Text>
            </Pressable>
            <Pressable
              className="py-3 rounded-md active:bg-red-500/10"
              onPress={() => {
                setConfirmDiscardOpen(false);
                router.back();
              }}
            >
              <Text className="text-red-400 text-sm">Discard changes</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
