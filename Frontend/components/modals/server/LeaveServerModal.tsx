import React from "react";
import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function LeaveServerModal({
  visible,
  isAdmin,
  serverName,
  leavePending,
  deletePending,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  isAdmin: boolean;
  serverName: string;
  leavePending: boolean;
  deletePending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={onClose}>
        <Pressable className="w-full max-w-[360px] bg-[#2B2D31] border border-[#1E1F22] rounded-2xl px-4 pt-3 pb-4" onPress={() => {}}>
          <Text className="text-[#F2F3F5] text-base font-semibold mb-2">{isAdmin ? "Delete server" : "Leave server"}</Text>
          <Text className="text-zinc-400 text-sm mb-4">{isAdmin ? `Are you sure you want to delete ${serverName}? This action cannot be undone.` : `Are you sure you want to leave ${serverName}?`}</Text>
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-red-500/10 mb-2" onPress={onConfirm} disabled={leavePending || deletePending}>
            <Ionicons name={isAdmin ? "trash-outline" : "log-out-outline"} size={18} color="#F87171" />
            <Text className="text-red-400 text-[15px] ml-3">{isAdmin ? (deletePending ? "Deleting..." : "Delete server") : leavePending ? "Leaving..." : "Leave server"}</Text>
          </Pressable>
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onClose}>
            <Ionicons name="close-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
