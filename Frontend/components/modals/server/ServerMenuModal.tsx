import React from "react";
import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ServerMenuModal({
  visible,
  isAdmin,
  leavePending,
  deletePending,
  onClose,
  onCreateChannel,
  onCreateChannelCategory,
  onInvitePeople,
  onOpenSettings,
  onOpenMembers,
  onReportServer,
  reportPending,
  onLeaveOrDelete,
}: {
  visible: boolean;
  isAdmin: boolean;
  leavePending: boolean;
  deletePending: boolean;
  onClose: () => void;
  onCreateChannel: () => void;
  onCreateChannelCategory: () => void;
  onInvitePeople: () => void;
  onOpenSettings: () => void;
  onOpenMembers: () => void;
  onReportServer: () => void;
  reportPending: boolean;
  onLeaveOrDelete: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-[#2B2D31] border-t border-[#1E1F22] px-4 pt-3 pb-6" onPress={() => {}}>
          <Text className="text-[#949BA4] text-xs font-semibold mb-2">SERVER</Text>
          {isAdmin ? (
            <>
              <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onCreateChannel}>
                <Ionicons name="add-circle-outline" size={18} color="#DBDEE1" />
                <Text className="text-[#DBDEE1] text-[15px] ml-3">Create channel</Text>
              </Pressable>
              <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onCreateChannelCategory}>
                <Ionicons name="folder-open-outline" size={18} color="#DBDEE1" />
                <Text className="text-[#DBDEE1] text-[15px] ml-3">Create channel category</Text>
              </Pressable>
              <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onInvitePeople}>
                <Ionicons name="person-add-outline" size={18} color="#DBDEE1" />
                <Text className="text-[#DBDEE1] text-[15px] ml-3">Invite people</Text>
              </Pressable>
              <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onOpenSettings}>
                <Ionicons name="settings-outline" size={18} color="#DBDEE1" />
                <Text className="text-[#DBDEE1] text-[15px] ml-3">Settings</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onOpenMembers}>
            <Ionicons name="people-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">Manage members</Text>
          </Pressable>
          {!isAdmin ? (
            <Pressable
              className={`flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60 ${
                reportPending ? "opacity-60" : ""
              }`}
              onPress={onReportServer}
              disabled={reportPending}
            >
              <Ionicons name="flag-outline" size={18} color="#FBBF24" />
              <Text className="text-amber-300 text-[15px] ml-3">
                {reportPending ? "Reporting..." : "Report server"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-red-500/10" onPress={onLeaveOrDelete} disabled={leavePending || deletePending}>
            <Ionicons name={isAdmin ? "trash-outline" : "log-out-outline"} size={18} color="#F87171" />
            <Text className="text-red-400 text-[15px] ml-3">
              {isAdmin ? (deletePending ? "Deleting..." : "Delete server") : leavePending ? "Leaving..." : "Leave server"}
            </Text>
          </Pressable>
          <Pressable className="mt-2 px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onClose}>
            <Text className="text-[#949BA4] text-[15px]">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
