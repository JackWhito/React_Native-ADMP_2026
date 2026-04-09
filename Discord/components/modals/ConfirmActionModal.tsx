import React from "react";
import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmIcon,
  confirmColorClassName,
  confirmIconColor,
  onConfirm,
  confirmPending = false,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon: React.ComponentProps<typeof Ionicons>["name"];
  confirmColorClassName?: string;
  confirmIconColor?: string;
  onConfirm: () => void;
  confirmPending?: boolean;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-6"
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Close confirm modal"
      >
        <Pressable
          className="w-full max-w-[360px] bg-[#2B2D31] border border-[#1E1F22] rounded-2xl px-4 pt-3 pb-4"
          onPress={() => {}}
        >
          <Text className="text-[#F2F3F5] text-base font-semibold mb-2">{title}</Text>
          <Text className="text-zinc-400 text-sm mb-4">{message}</Text>
          <Pressable
            className="flex-row items-center px-3 py-3 rounded-md active:bg-red-500/10 mb-2"
            onPress={onConfirm}
            disabled={confirmPending}
          >
            <Ionicons name={confirmIcon} size={18} color={confirmIconColor ?? "#F87171"} />
            <Text className={`text-[15px] ml-3 ${confirmColorClassName ?? "text-red-400"}`}>
              {confirmPending ? "Processing..." : confirmLabel}
            </Text>
          </Pressable>
          <Pressable
            className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
            onPress={onCancel}
          >
            <Ionicons name="close-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
