import React from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SearchChannelItem, ServerMember } from "./types";

export default function SearchModal({
  visible,
  searchText,
  setSearchText,
  normalizedSearch,
  matchedChannels,
  matchedMembers,
  onClose,
  onOpenChannel,
}: {
  visible: boolean;
  searchText: string;
  setSearchText: (v: string) => void;
  normalizedSearch: string;
  matchedChannels: SearchChannelItem[];
  matchedMembers: ServerMember[];
  onClose: () => void;
  onOpenChannel: (channel: SearchChannelItem) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={onClose}>
        <Pressable className="w-full max-w-[420px] bg-[#2B2D31] border border-[#1E1F22] rounded-2xl px-4 pt-3 pb-4" onPress={() => {}}>
          <Text className="text-[#F2F3F5] text-base font-semibold mb-3">Search</Text>
          <View className="flex-row items-center rounded-full border border-zinc-700 bg-zinc-800 px-3 h-11 mb-3">
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search channel or member" placeholderTextColor="#71717a" className="flex-1 text-white ml-2" autoCapitalize="none" autoCorrect={false} />
          </View>
          {!normalizedSearch ? (
            <Text className="text-zinc-400 text-sm px-1 py-2">Type to search channels or members.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <Text className="text-[#949BA4] text-xs font-semibold mb-2 mt-1">CHANNELS</Text>
              {matchedChannels.length ? matchedChannels.map((channel) => (
                <Pressable key={channel._id} className="flex-row items-center justify-between px-2 py-2 rounded-md active:bg-zinc-700/60" onPress={() => onOpenChannel(channel)}>
                  <View className="flex-row items-center flex-1 pr-2">
                    <Ionicons name={channel.type === "text" ? "chatbubble-outline" : "volume-medium-outline"} size={16} color="#D4D4D8" />
                    <View className="ml-2 flex-1">
                      <Text className="text-zinc-100 text-sm font-semibold" numberOfLines={1}>{channel.type === "text" ? `#${channel.name}` : channel.name}</Text>
                      <Text className="text-zinc-400 text-xs" numberOfLines={1}>{channel.categoryName}</Text>
                    </View>
                  </View>
                  <Text className="text-zinc-500 text-xs">{channel.type === "text" ? "chat" : "audio"}</Text>
                </Pressable>
              )) : <Text className="text-zinc-500 text-xs px-2 py-2">No channels found.</Text>}
              <Text className="text-[#949BA4] text-xs font-semibold mb-2 mt-3">MEMBERS</Text>
              {matchedMembers.length ? matchedMembers.map((member) => (
                <View key={member._id} className="flex-row items-center justify-between px-2 py-2 rounded-md">
                  <View className="flex-row items-center flex-1 pr-2">
                    {member.imageUrl ? <Image source={{ uri: member.imageUrl }} className="h-7 w-7 rounded-full bg-zinc-800" resizeMode="cover" /> : <View className="h-7 w-7 rounded-full bg-zinc-700 items-center justify-center"><Ionicons name="person" size={14} color="#E4E4E7" /></View>}
                    <View className="ml-2 flex-1">
                      <Text className="text-zinc-100 text-sm font-semibold" numberOfLines={1}>{member.name}</Text>
                      <Text className="text-zinc-400 text-xs" numberOfLines={1}>@{member.username ?? "unknown"}</Text>
                    </View>
                  </View>
                  <Text className="text-zinc-500 text-xs">{member.role === "admin" ? "admin" : "guest"}</Text>
                </View>
              )) : <Text className="text-zinc-500 text-xs px-2 py-2">No members found.</Text>}
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
