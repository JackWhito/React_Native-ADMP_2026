import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, Share, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useServerChannelList, useServerInvite } from "@/hooks/useServer";
import { useChat } from "@/hooks/useChat";
import { useCreateServerInviteNotification } from "@/hooks/useNotification";
import * as Clipboard from "expo-clipboard";
import type { ServerChannel } from "@/types";

function ChannelRow({
  channel,
  onTextChannelPress,
}: {
  channel: ServerChannel;
  onTextChannelPress?: (channel: ServerChannel) => void;
}) {
  const isText = channel.type === "text";
  return (
    <Pressable
      className="flex-row items-center px-3 py-2 pl-7 rounded-md active:bg-zinc-800/80"
      onPress={() => {
        if (isText) onTextChannelPress?.(channel);
      }}
    >
      <Ionicons
        name={isText ? "chatbubble-outline" : "volume-medium"}
        size={18}
        color="#949BA4"
        style={{ width: 22 }}
      />
      <Text className="text-[#DBDEE1] text-[15px] ml-2" numberOfLines={1}>
        {isText ? `#${channel.name}` : channel.name}
      </Text>
    </Pressable>
  );
}

function ChannelSectionDropdown({
  title,
  defaultExpanded = true,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <View className="mt-0.5">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center px-2 py-2.5 active:bg-zinc-800/40 rounded"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${open ? "expanded" : "collapsed"}`}
      >
        <Ionicons
          name={open ? "chevron-down" : "chevron-forward"}
          size={14}
          color="#949BA4"
          style={{ marginRight: 4 }}
        />
        <Text className="text-[#949BA4] text-[11px] font-bold tracking-wide">{title}</Text>
      </Pressable>
      {open ? <View>{children}</View> : null}
    </View>
  );
}

export default function ServerChannelsBody({
  serverId,
  serverName,
  onBack,
  onOpenTextChannel,
  onCreateChannel,
  onCreateChannelCategory,
  onInvitePeople,
  onOpenServerSettings,
}: {
  serverId: string;
  serverName: string;
  onBack: () => void;
  onOpenTextChannel?: (channel: ServerChannel) => void;
  onCreateChannel?: () => void;
  onCreateChannelCategory?: () => void;
  onInvitePeople?: () => void;
  onOpenServerSettings?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: channelList, isLoading, error } = useServerChannelList(serverId);
  const { data: inviteData } = useServerInvite(serverId);
  const { data: conversations, isLoading: friendsLoading } = useChat();
  const createInviteNotification = useCreateServerInviteNotification();
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);

  const openTextChannel = useCallback(
    (channel: ServerChannel) => {
      if (onOpenTextChannel) {
        onOpenTextChannel(channel);
        return;
      }
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: channel._id,
          name: `#${channel.name}`,
          scope: "channel",
          serverId,
          serverName,
        },
      });
    },
    [router, serverId, serverName, onOpenTextChannel]
  );

  const closeServerMenu = useCallback(() => {
    setServerMenuOpen(false);
  }, []);

  const handleCreateChannel = useCallback(() => {
    closeServerMenu();
    if (onCreateChannel) {
      onCreateChannel();
      return;
    }
    router.push({
      pathname: "/server/create-channel",
      params: { serverId, serverName },
    });
  }, [closeServerMenu, onCreateChannel, router, serverId, serverName]);

  const handleInvitePeople = useCallback(() => {
    closeServerMenu();
    if (onInvitePeople) {
      onInvitePeople();
      return;
    }
    setInviteModalOpen(true);
  }, [closeServerMenu, onInvitePeople]);

  const handleCreateChannelCategory = useCallback(() => {
    closeServerMenu();
    if (onCreateChannelCategory) {
      onCreateChannelCategory();
      return;
    }
    router.push({
      pathname: "/server/create-category",
      params: { serverId, serverName },
    });
  }, [closeServerMenu, onCreateChannelCategory, router, serverId, serverName]);

  const handleOpenSettings = useCallback(() => {
    closeServerMenu();
    onOpenServerSettings?.();
  }, [closeServerMenu, onOpenServerSettings]);

  const closeInviteModal = useCallback(() => {
    setInviteModalOpen(false);
    setShowFriendList(false);
  }, []);

  const handleShareInviteLink = useCallback(async () => {
    const link = inviteData?.inviteLink;
    if (!link) {
      Alert.alert("Invite unavailable", "Could not load invite link yet. Please try again.");
      return;
    }
    try {
      await Share.share({
        title: `Join ${serverName}`,
        message: `Join ${serverName} via invite link: ${link}`,
      });
    } catch {
      Alert.alert("Share failed", "Could not open share options.");
    }
  }, [inviteData?.inviteLink, serverName]);

  const handleInviteFriend = useCallback(() => {
    setShowFriendList(true);
  }, []);

  const handleInviteSpecificFriend = useCallback(
    async (friendId: string, friendName: string) => {
      try {
        await createInviteNotification.mutateAsync({ serverId, recipientId: friendId });
        Alert.alert(
          "Invite sent",
          `${friendName} will get a notification and can join after accepting.`
        );
      } catch (error: any) {
        const message =
          error?.response?.data?.error ??
          error?.message ??
          "Could not send invite request.";
        Alert.alert("Invite failed", String(message));
      }
    },
    [createInviteNotification, serverId]
  );

  const handleCopyInviteLink = useCallback(async () => {
    const link = inviteData?.inviteLink;
    if (!link) {
      Alert.alert("Invite unavailable", "Could not load invite link yet. Please try again.");
      return;
    }
    await Clipboard.setStringAsync(link);
    Alert.alert("Copied", "Invite link copied to clipboard.");
  }, [inviteData?.inviteLink]);

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center border-b border-[#1E1F22] bg-[#2B2D31] px-2 py-2.5"
        style={{ paddingTop: Math.max(insets.top, 8) }}
      >
        <Pressable
          onPress={onBack}
          className="rounded-full p-1.5 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#F2F3F5" />
        </Pressable>
        <Pressable
          className="flex-1 flex-row items-center justify-center px-2 py-1 active:opacity-80"
          onPress={() => setServerMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open server settings menu"
        >
          <Text className="text-[#F2F3F5] text-base font-semibold text-center" numberOfLines={1}>
            {serverName}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#F2F3F5" style={{ marginLeft: 6 }} />
        </Pressable>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator color="#949BA4" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-4 py-12">
          <Text className="text-red-400 text-sm">Could not load channels.</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {(channelList?.categories ?? []).map((cat) => (
            <ChannelSectionDropdown key={cat._id} title={cat.name.toUpperCase()} defaultExpanded>
              {cat.channels.map((c) => (
                <ChannelRow key={c._id} channel={c} onTextChannelPress={openTextChannel} />
              ))}
              {!cat.channels.length ? (
                <Text className="text-muted-foreground text-sm px-3 py-2 pl-7">No channels.</Text>
              ) : null}
            </ChannelSectionDropdown>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={serverMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeServerMenu}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={closeServerMenu}
          accessibilityRole="button"
          accessibilityLabel="Close server settings modal"
        >
          <Pressable
            className="bg-[#2B2D31] border-t border-[#1E1F22] px-4 pt-3 pb-6"
            onPress={() => {}}
          >
            <Text className="text-[#949BA4] text-xs font-semibold mb-2">SERVER</Text>

            <Pressable
              className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
              onPress={handleCreateChannel}
            >
              <Ionicons name="add-circle-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Create channel</Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
              onPress={handleCreateChannelCategory}
            >
              <Ionicons name="folder-open-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Create channel category</Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
              onPress={handleInvitePeople}
            >
              <Ionicons name="person-add-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Invite people</Text>
            </Pressable>

            <Pressable
              className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
              onPress={handleOpenSettings}
            >
              <Ionicons name="settings-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Settings</Text>
            </Pressable>

            <Pressable
              className="mt-2 px-3 py-3 rounded-md active:bg-zinc-700/60"
              onPress={closeServerMenu}
            >
              <Text className="text-[#949BA4] text-[15px]">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={inviteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeInviteModal}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={closeInviteModal}
          accessibilityRole="button"
          accessibilityLabel="Close invite modal"
        >
          <Pressable
            className="bg-[#2B2D31] border-t border-[#1E1F22] px-4 pt-3 pb-6"
            onPress={() => {}}
          >
            <Text className="text-[#F2F3F5] text-base font-semibold mb-1">Invite people</Text>
            <Text className="text-[#949BA4] text-xs mb-4" numberOfLines={1}>
              {serverName}
            </Text>

            <Text className="text-[#949BA4] text-xs font-semibold mb-2">INVITE LINK</Text>
            <View className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 mb-2">
              <Text className="text-zinc-200 text-[13px]" numberOfLines={2}>
                {inviteData?.inviteLink ?? "Loading invite link..."}
              </Text>
            </View>
            <Pressable
              className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60 mb-3"
              onPress={handleShareInviteLink}
            >
              <Ionicons name="link-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Share invite link</Text>
            </Pressable>
            <Pressable
              className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60 mb-3"
              onPress={handleCopyInviteLink}
            >
              <Ionicons name="copy-outline" size={18} color="#DBDEE1" />
              <Text className="text-[#DBDEE1] text-[15px] ml-3">Copy invite link</Text>
            </Pressable>

            <Text className="text-[#949BA4] text-xs font-semibold mb-2">INVITE FRIEND</Text>
            {!showFriendList ? (
              <Pressable
                className="flex-row items-center px-3 py-3 rounded-md active:bg-zinc-700/60"
                onPress={handleInviteFriend}
              >
                <Ionicons name="person-add-outline" size={18} color="#DBDEE1" />
                <Text className="text-[#DBDEE1] text-[15px] ml-3">Invite friend</Text>
              </Pressable>
            ) : (
              <View className="rounded-md border border-zinc-700 bg-zinc-800 p-2">
                {friendsLoading ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator color="#949BA4" />
                  </View>
                ) : !(conversations?.length ?? 0) ? (
                  <Text className="text-zinc-400 text-sm px-2 py-3">No friends available.</Text>
                ) : (
                  <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                    {conversations?.map((c) => (
                      <View
                        key={c._id}
                        className="flex-row items-center justify-between px-2 py-2 rounded-md"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-zinc-100 text-sm font-semibold" numberOfLines={1}>
                            {c.member.name}
                          </Text>
                          <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                            @{c.member.username ?? "unknown"}
                          </Text>
                        </View>
                        <Pressable
                          className="px-3 py-2 rounded bg-indigo-500 active:opacity-80"
                          onPress={() =>
                            handleInviteSpecificFriend(String(c.member._id), c.member.name)
                          }
                        >
                          <Text className="text-white text-xs font-semibold">Invite</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            <Pressable
              className="mt-3 px-3 py-3 rounded-md active:bg-zinc-700/60"
              onPress={closeInviteModal}
            >
              <Text className="text-[#949BA4] text-[15px]">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
