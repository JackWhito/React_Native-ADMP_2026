import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { InviteConversationItem, ServerInvite } from "./types";

export default function InvitePeopleModal({
  visible,
  serverName,
  inviteData,
  showFriendList,
  setShowFriendList,
  friendsLoading,
  conversations,
  onClose,
  onShareInviteLink,
  onCopyInviteLink,
  onInviteSpecificFriend,
}: {
  visible: boolean;
  serverName: string;
  inviteData?: ServerInvite;
  showFriendList: boolean;
  setShowFriendList: (v: boolean) => void;
  friendsLoading: boolean;
  conversations: InviteConversationItem[];
  onClose: () => void;
  onShareInviteLink: () => void;
  onCopyInviteLink: () => void;
  onInviteSpecificFriend: (friendId: string, friendName: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-[#2B2D31] border-t border-[#1E1F22] px-4 pt-3 pb-6" onPress={() => {}}>
          <Text className="text-[#F2F3F5] text-base font-semibold mb-1">Invite people</Text>
          <Text className="text-[#949BA4] text-xs mb-4" numberOfLines={1}>{serverName}</Text>
          <Text className="text-[#949BA4] text-xs font-semibold mb-2">INVITE LINK</Text>
          <View className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 mb-2">
            <Text className="text-zinc-200 text-[13px]" numberOfLines={2}>{inviteData?.inviteLink ?? "Loading invite link..."}</Text>
          </View>
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60 mb-3" onPress={onShareInviteLink}>
            <Ionicons name="link-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">Share invite link</Text>
          </Pressable>
          <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60 mb-3" onPress={onCopyInviteLink}>
            <Ionicons name="copy-outline" size={18} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-[15px] ml-3">Copy invite link</Text>
          </Pressable>
          <Text className="text-[#949BA4] text-xs font-semibold mb-2">INVITE FRIEND</Text>
          {!showFriendList ? (
            <Pressable className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={() => setShowFriendList(true)}>
              <Ionicons name="person-add-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Invite friend</Text>
            </Pressable>
          ) : (
            <View className="rounded-md border border-zinc-700 bg-zinc-800 p-2">
              {friendsLoading ? <View className="py-4 items-center"><ActivityIndicator color="#949BA4" /></View> : !conversations.length ? (
                <Text className="text-zinc-400 text-sm px-2 py-3">No friends available.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {conversations.map((c) => (
                    <View key={c._id} className="flex-row items-center justify-between px-2 py-2 rounded-md">
                      <View className="flex-1 pr-2">
                        <Text className="text-zinc-100 text-sm font-semibold" numberOfLines={1}>{c.member.name}</Text>
                        <Text className="text-zinc-400 text-xs" numberOfLines={1}>@{c.member.username ?? "unknown"}</Text>
                      </View>
                      <Pressable className="px-3 py-2 rounded bg-indigo-500 active:opacity-80" onPress={() => onInviteSpecificFriend(String(c.member._id), c.member.name)}>
                        <Text className="text-white text-xs font-semibold">Invite</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          <Pressable className="mt-3 px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onClose}>
            <Text className="text-[#949BA4] text-[15px]">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
