import React from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ServerMembersPayload } from "./types";

export default function MembersModal({
  visible,
  membersLoading,
  serverMembers,
  isAdmin,
  actionPending,
  onClose,
  onOpenMemberActions,
}: {
  visible: boolean;
  membersLoading: boolean;
  serverMembers?: ServerMembersPayload;
  isAdmin: boolean;
  actionPending: boolean;
  onClose: () => void;
  onOpenMemberActions: (memberId: string, memberName: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-[#2B2D31] border-t border-[#1E1F22] px-4 pt-3 pb-6" onPress={() => {}}>
          <Text className="text-[#F2F3F5] text-base font-semibold">Manage members</Text>
          <Text className="text-[#949BA4] text-xs mt-1 mb-3">Total members: {serverMembers?.total ?? 0}</Text>
          {membersLoading ? (
            <View className="py-6 items-center"><ActivityIndicator color="#949BA4" /></View>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {(serverMembers?.members ?? []).map((m) => (
                <View key={m._id} className="flex-row items-center px-2 py-2 border-b border-zinc-800">
                  {m.imageUrl ? <Image source={{ uri: m.imageUrl }} className="h-9 w-9 rounded-full bg-zinc-800 mr-3" resizeMode="cover" /> : <View className="h-9 w-9 rounded-full bg-zinc-700 mr-3 items-center justify-center"><Ionicons name="person" size={16} color="#E4E4E7" /></View>}
                  <View className="flex-1">
                    <Text className="text-zinc-100 text-sm font-semibold" numberOfLines={1}>{m.name}</Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-zinc-400 text-xs" numberOfLines={1}>@{m.username ?? "unknown"}</Text>
                      <Text className="text-zinc-500 text-xs ml-2">· {m.role === "admin" ? "admin" : "guest"}</Text>
                    </View>
                  </View>
                  {isAdmin && m.role === "guest" ? <Pressable className="px-3 py-1.5 rounded bg-red-500/20 active:opacity-80" onPress={() => onOpenMemberActions(m._id, m.name)} disabled={actionPending}><Text className="text-zinc-200 text-xs font-semibold">{actionPending ? "..." : "Action"}</Text></Pressable> : null}
                </View>
              ))}
              {!(serverMembers?.members?.length ?? 0) ? <Text className="text-zinc-400 text-sm py-6 text-center">No members found.</Text> : null}
            </ScrollView>
          )}
          <Pressable className="mt-3 px-3 py-3 rounded-md active:bg-zinc-700/60" onPress={onClose}>
            <Text className="text-[#949BA4] text-[15px]">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
