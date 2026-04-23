import React from "react";
import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MemberActionModal({
  visible,
  memberName,
  grantPending,
  kickPending,
  onClose,
  onGrantAdmin,
  onKick,
}: {
  visible: boolean;
  memberName?: string;
  grantPending: boolean;
  kickPending: boolean;
  onClose: () => void;
  onGrantAdmin: () => void;
  onKick: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={onClose}>
        <Pressable className="w-full max-w-[360px] bg-[#2B2D31] border border-[#1E1F22] rounded-2xl px-4 pt-3 pb-4" onPress={() => {}}>
          <Text className="text-[#F2F3F5] text-base font-semibold mb-3">Member actions{memberName ? ` · ${memberName}` : ""}</Text>
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60 mb-2" onPress={onGrantAdmin} disabled={grantPending}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">{grantPending ? "Updating..." : "Grant admin"}</Text>
          </Pressable>
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-red-500/10" onPress={onKick} disabled={kickPending}>
            <Ionicons name="person-remove-outline" size={18} color="#F87171" />
            <Text className="text-red-400 text-[15px] ml-3">{kickPending ? "Removing..." : "Kick"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
