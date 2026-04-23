import React from "react";
import { Image, Modal, Pressable, Text, TextInput } from "react-native";

export default function EditServerModal({
  visible,
  editingName,
  setEditingName,
  editingImageUrl,
  setEditingImageUrl,
  saving,
  onPickImage,
  onSave,
  onClose,
}: {
  visible: boolean;
  editingName: string;
  setEditingName: (v: string) => void;
  editingImageUrl: string;
  setEditingImageUrl: (v: string) => void;
  saving: boolean;
  onPickImage: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-[#2B2D31] border-t border-[#1E1F22] px-4 pt-3 pb-6" onPress={() => {}}>
          <Text className="text-[#F2F3F5] text-base font-semibold mb-4">Edit server</Text>
          <Text className="text-[#949BA4] text-xs font-semibold mb-2">SERVER NAME</Text>
          <TextInput value={editingName} onChangeText={setEditingName} placeholder="Server name" placeholderTextColor="#71717a" className="bg-zinc-800 text-white rounded-md px-3 py-3 mb-4" autoCapitalize="words" />
          <Text className="text-[#949BA4] text-xs font-semibold mb-2">SERVER IMAGE URL</Text>
          {!!editingImageUrl ? <Image source={{ uri: editingImageUrl }} className="h-28 w-28 rounded-xl mb-3 bg-zinc-800" resizeMode="cover" /> : null}
          <Pressable className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 mb-3" onPress={onPickImage}>
            <Text className="text-zinc-200 text-center font-semibold">Pick image from library</Text>
          </Pressable>
          <TextInput value={editingImageUrl} onChangeText={setEditingImageUrl} placeholder="https://example.com/server.png" placeholderTextColor="#71717a" className="bg-zinc-800 text-white rounded-md px-3 py-3 mb-4" autoCapitalize="none" autoCorrect={false} />
          <Pressable className="bg-indigo-500 rounded-md px-3 py-3 active:opacity-80 mb-2" onPress={onSave} disabled={saving}>
            <Text className="text-white text-center font-semibold">{saving ? "Saving..." : "Save changes"}</Text>
          </Pressable>
          <Pressable className="px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onClose}>
            <Text className="text-[#949BA4] text-[15px]">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
