import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AppDialogModal({
  visible,
  title,
  message,
  onClose,
  closeLabel = "OK",
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  closeLabel?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-6"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close message modal"
      >
        <Pressable
          className="w-full max-w-[360px] bg-[#2B2D31] border border-[#1E1F22] rounded-2xl px-4 pt-3 pb-4"
          onPress={() => {}}
        >
          <Text className="text-[#F2F3F5] text-base font-semibold mb-2">{title}</Text>
          <Text className="text-zinc-300 text-sm mb-4">{message}</Text>
          <Pressable
            className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
            onPress={onClose}
          >
            <Ionicons name="checkmark-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
