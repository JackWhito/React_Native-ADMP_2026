import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useDeleteServer,
  useServerChannelList,
  useGrantMemberAdminRole,
  useKickGuestMember,
  useLeaveServer,
  useServerInvite,
  useServerMembers,
  useUpdateServer,
} from "@/hooks/useServer";
import { useChat } from "@/hooks/useChat";
import { useCreateServerInviteNotification } from "@/hooks/useNotification";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import type { ServerChannel } from "@/types";
import AppDialogModal from "@/components/modals/AppDialogModal";
import ConfirmActionModal from "@/components/modals/ConfirmActionModal";
import {
  CategoryActionModal,
  EditServerModal,
  InvitePeopleModal,
  LeaveServerModal,
  MemberActionModal,
  MembersModal,
  SearchModal,
  ServerMenuModal,
} from "@/components/modals/server";
import type { SearchChannelItem } from "@/components/modals/server";

type SimpleDialogState = {
  open: boolean;
  title: string;
  message: string;
};

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
  onLongPress,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  onLongPress?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <View className="mt-0.5">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        onLongPress={onLongPress}
        delayLongPress={300}
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
  serverImageUrl,
  onBack,
  onOpenTextChannel,
  onCreateChannel,
  onCreateChannelCategory,
  onInvitePeople,
  onOpenServerSettings,
}: {
  serverId: string;
  serverName: string;
  serverImageUrl?: string;
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
  const { data: serverMembers, isLoading: membersLoading } = useServerMembers(serverId);
  const { data: conversations, isLoading: friendsLoading } = useChat();
  const createInviteNotification = useCreateServerInviteNotification();
  const updateServer = useUpdateServer();
  const grantMemberAdminRole = useGrantMemberAdminRole();
  const kickGuestMember = useKickGuestMember();
  const leaveServer = useLeaveServer();
  const deleteServer = useDeleteServer();
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [memberActionModalOpen, setMemberActionModalOpen] = useState(false);
  const [categoryActionModalOpen, setCategoryActionModalOpen] = useState(false);
  const [leaveConfirmModalOpen, setLeaveConfirmModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [simpleDialog, setSimpleDialog] = useState<SimpleDialogState>({
    open: false,
    title: "",
    message: "",
  });
  const [kickConfirm, setKickConfirm] = useState<{ open: boolean; memberId: string; memberName: string }>({
    open: false,
    memberId: "",
    memberName: "",
  });
  const [activeMember, setActiveMember] = useState<{ id: string; name: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<{ id: string; name: string } | null>(null);
  const [editingName, setEditingName] = useState(serverName);
  const [editingImageUrl, setEditingImageUrl] = useState(serverImageUrl ?? "");
  const myRole = serverMembers?.myRole ?? "guest";
  const isAdmin = myRole === "admin";
  const showDialog = useCallback((title: string, message: string) => {
    setSimpleDialog({ open: true, title, message });
  }, []);
  const closeDialog = useCallback(() => {
    setSimpleDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const searchableChannels = useMemo<SearchChannelItem[]>(
    () =>
      (channelList?.categories ?? []).flatMap((cat) =>
        cat.channels.map((channel) => ({
          ...channel,
          categoryName: cat.name,
        }))
      ),
    [channelList?.categories]
  );

  const normalizedSearch = searchText.trim().toLowerCase();
  const matchedChannels = useMemo(() => {
    if (!normalizedSearch) return [];
    return searchableChannels.filter((channel) => {
      const name = String(channel.name ?? "").toLowerCase();
      const category = String(channel.categoryName ?? "").toLowerCase();
      const type = String(channel.type ?? "").toLowerCase();
      return (
        name.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        type.includes(normalizedSearch)
      );
    });
  }, [normalizedSearch, searchableChannels]);

  const matchedMembers = useMemo(() => {
    if (!normalizedSearch) return [];
    return (serverMembers?.members ?? []).filter((member) => {
      const name = String(member.name ?? "").toLowerCase();
      const username = String(member.username ?? "").toLowerCase();
      return name.includes(normalizedSearch) || username.includes(normalizedSearch);
    });
  }, [normalizedSearch, serverMembers?.members]);

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

  const handleQuickInvite = useCallback(() => {
    setInviteModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModalOpen(false);
    setSearchText("");
  }, []);

  const handleSearchChannels = useCallback(() => {
    setSearchModalOpen(true);
  }, []);

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
    if (onOpenServerSettings) {
      onOpenServerSettings();
      return;
    }
    setEditingName(serverName);
    setEditingImageUrl(serverImageUrl ?? "");
    setSettingsModalOpen(true);
  }, [closeServerMenu, onOpenServerSettings, serverName, serverImageUrl]);

  const closeSettingsModal = useCallback(() => {
    setSettingsModalOpen(false);
  }, []);

  const handleOpenMembersModal = useCallback(() => {
    closeServerMenu();
    setMembersModalOpen(true);
  }, [closeServerMenu]);

  const closeMembersModal = useCallback(() => {
    setMembersModalOpen(false);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    const nextName = editingName.trim();
    if (!nextName) {
      showDialog("Invalid name", "Server name cannot be empty.");
      return;
    }
    try {
      await updateServer.mutateAsync({
        serverId,
        name: nextName,
        imageUrl: editingImageUrl.trim(),
      });
      showDialog("Server updated", "Server settings were saved.");
      closeSettingsModal();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Could not update server.";
      showDialog("Update failed", String(message));
    }
  }, [editingImageUrl, editingName, updateServer, serverId, closeSettingsModal, showDialog]);

  const handlePickServerImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      const picked = result.assets?.[0]?.uri;
      if (picked) setEditingImageUrl(picked);
    } catch {
      showDialog("Image picker failed", "Could not pick image from gallery.");
    }
  }, [showDialog]);

  const closeInviteModal = useCallback(() => {
    setInviteModalOpen(false);
    setShowFriendList(false);
  }, []);

  const handleShareInviteLink = useCallback(async () => {
    const link = inviteData?.inviteLink;
    if (!link) {
      showDialog("Invite unavailable", "Could not load invite link yet. Please try again.");
      return;
    }
    try {
      await Share.share({
        title: `Join ${serverName}`,
        message: `Join ${serverName} via invite link: ${link}`,
      });
    } catch {
      showDialog("Share failed", "Could not open share options.");
    }
  }, [inviteData?.inviteLink, serverName, showDialog]);

  const handleInviteSpecificFriend = useCallback(
    async (friendId: string, friendName: string) => {
      try {
        await createInviteNotification.mutateAsync({ serverId, recipientId: friendId });
        showDialog(
          "Invite sent",
          `${friendName} will get a notification and can join after accepting.`
        );
      } catch (error: any) {
        const message =
          error?.response?.data?.error ??
          error?.message ??
          "Could not send invite request.";
        showDialog("Invite failed", String(message));
      }
    },
    [createInviteNotification, serverId, showDialog]
  );

  const handleCopyInviteLink = useCallback(async () => {
    const link = inviteData?.inviteLink;
    if (!link) {
      showDialog("Invite unavailable", "Could not load invite link yet. Please try again.");
      return;
    }
    await Clipboard.setStringAsync(link);
    showDialog("Copied", "Invite link copied to clipboard.");
  }, [inviteData?.inviteLink, showDialog]);

  const handleLeaveServer = useCallback(() => {
    closeServerMenu();
    setLeaveConfirmModalOpen(true);
  }, [closeServerMenu]);

  const closeLeaveConfirmModal = useCallback(() => {
    setLeaveConfirmModalOpen(false);
  }, []);

  const handleConfirmLeaveServer = useCallback(async () => {
    try {
      if (isAdmin) {
        await deleteServer.mutateAsync(serverId);
      } else {
        await leaveServer.mutateAsync(serverId);
      }
      closeLeaveConfirmModal();
      showDialog(
        isAdmin ? "Server deleted" : "Left server",
        isAdmin ? `${serverName} was deleted.` : `You left ${serverName}.`
      );
      onBack();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        (isAdmin ? "Could not delete server." : "Could not leave server.");
      showDialog(isAdmin ? "Delete failed" : "Leave failed", String(message));
    }
  }, [deleteServer, isAdmin, leaveServer, serverId, closeLeaveConfirmModal, serverName, onBack, showDialog]);

  const handleKickGuest = useCallback(
    (memberId: string, memberName: string) => {
      setKickConfirm({ open: true, memberId, memberName });
    },
    []
  );

  const handleOpenMemberActions = useCallback(
    (memberId: string, memberName: string) => {
      setActiveMember({ id: memberId, name: memberName });
      setMemberActionModalOpen(true);
    },
    []
  );

  const closeMemberActionModal = useCallback(() => {
    setMemberActionModalOpen(false);
    setActiveMember(null);
  }, []);

  const handleGrantAdminFromModal = useCallback(async () => {
    if (!activeMember) return;
    try {
      await grantMemberAdminRole.mutateAsync({ serverId, memberId: activeMember.id });
      showDialog("Role updated", `${activeMember.name} is now an admin.`);
      closeMemberActionModal();
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Could not grant admin role.";
      showDialog("Update failed", String(message));
    }
  }, [activeMember, grantMemberAdminRole, serverId, closeMemberActionModal, showDialog]);

  const handleKickFromModal = useCallback(() => {
    if (!activeMember) return;
    closeMemberActionModal();
    handleKickGuest(activeMember.id, activeMember.name);
  }, [activeMember, closeMemberActionModal, handleKickGuest]);

  const closeKickConfirm = useCallback(() => {
    setKickConfirm((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirmKick = useCallback(async () => {
    if (!kickConfirm.memberId) return;
    try {
      await kickGuestMember.mutateAsync({ serverId, memberId: kickConfirm.memberId });
      closeKickConfirm();
      showDialog("Member removed", `${kickConfirm.memberName} has been removed.`);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Could not kick member.";
      showDialog("Kick failed", String(message));
    }
  }, [kickConfirm.memberId, kickConfirm.memberName, kickGuestMember, serverId, closeKickConfirm, showDialog]);

  const handleOpenCategoryActions = useCallback(
    (categoryId: string, categoryName: string) => {
      if (!isAdmin) return;
      setActiveCategory({ id: categoryId, name: categoryName });
      setCategoryActionModalOpen(true);
    },
    [isAdmin]
  );

  const closeCategoryActionModal = useCallback(() => {
    setCategoryActionModalOpen(false);
    setActiveCategory(null);
  }, []);

  const handleCreateChannelFromCategory = useCallback(() => {
    if (!activeCategory) return;
    closeCategoryActionModal();
    router.push({
      pathname: "/server/create-channel",
      params: { serverId, serverName, categoryId: activeCategory.id },
    });
  }, [activeCategory, closeCategoryActionModal, router, serverId, serverName]);

  const handleEditCategory = useCallback(() => {
    if (!activeCategory) return;
    closeCategoryActionModal();
    router.push({
      pathname: "/server/edit-category",
      params: {
        serverId,
        serverName,
        categoryId: activeCategory.id,
        categoryName: activeCategory.name,
      },
    });
  }, [activeCategory, closeCategoryActionModal, router, serverId, serverName]);

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
      <View className="flex-row items-center gap-2 px-3 py-2 bg-[#2B2D31] border-b border-[#1E1F22]">
        <Pressable
          className="h-10 rounded-full bg-zinc-800/80 border border-zinc-700 items-center justify-center active:opacity-80"
          style={{ flex: 3 }}
          onPress={handleSearchChannels}
        >
          <View className="flex-row items-center">
            <Ionicons name="search-outline" size={16} color="#DBDEE1" />
            <Text className="text-[#DBDEE1] text-sm font-semibold ml-1.5">Search</Text>
          </View>
        </Pressable>
        <Pressable
          className="h-10 rounded-full bg-indigo-500/20 border border-indigo-400/40 items-center justify-center active:opacity-80"
          style={{ flex: 1 }}
          onPress={handleQuickInvite}
        >
          <View className="flex-row items-center">
            <Ionicons name="person-add-outline" size={16} color="#C7D2FE" />
            <Text className="text-indigo-200 text-sm font-semibold ml-1.5">Invite</Text>
          </View>
        </Pressable>
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
            <ChannelSectionDropdown
              key={cat._id}
              title={cat.name.toUpperCase()}
              defaultExpanded
              onLongPress={() => handleOpenCategoryActions(cat._id, cat.name)}
            >
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

      <ServerMenuModal
        visible={serverMenuOpen}
        isAdmin={isAdmin}
        leavePending={leaveServer.isPending}
        deletePending={deleteServer.isPending}
        onClose={closeServerMenu}
        onCreateChannel={handleCreateChannel}
        onCreateChannelCategory={handleCreateChannelCategory}
        onInvitePeople={handleInvitePeople}
        onOpenSettings={handleOpenSettings}
        onOpenMembers={handleOpenMembersModal}
        onLeaveOrDelete={handleLeaveServer}
      />

      <SearchModal
        visible={searchModalOpen}
        searchText={searchText}
        setSearchText={setSearchText}
        normalizedSearch={normalizedSearch}
        matchedChannels={matchedChannels}
        matchedMembers={matchedMembers}
        onClose={closeSearchModal}
        onOpenChannel={(channel) => {
          closeSearchModal();
          openTextChannel(channel);
        }}
      />

      <InvitePeopleModal
        visible={inviteModalOpen}
        serverName={serverName}
        inviteData={inviteData}
        showFriendList={showFriendList}
        setShowFriendList={setShowFriendList}
        friendsLoading={friendsLoading}
        conversations={(conversations ?? []).map((c) => ({
          _id: c._id,
          member: {
            _id: String(c.member._id),
            name: c.member.name,
            username: c.member.username,
          },
        }))}
        onClose={closeInviteModal}
        onShareInviteLink={handleShareInviteLink}
        onCopyInviteLink={handleCopyInviteLink}
        onInviteSpecificFriend={handleInviteSpecificFriend}
      />

      <EditServerModal
        visible={settingsModalOpen}
        editingName={editingName}
        setEditingName={setEditingName}
        editingImageUrl={editingImageUrl}
        setEditingImageUrl={setEditingImageUrl}
        saving={updateServer.isPending}
        onPickImage={handlePickServerImage}
        onSave={handleSaveSettings}
        onClose={closeSettingsModal}
      />

      <MembersModal
        visible={membersModalOpen}
        membersLoading={membersLoading}
        serverMembers={serverMembers}
        isAdmin={isAdmin}
        actionPending={kickGuestMember.isPending || grantMemberAdminRole.isPending}
        onClose={closeMembersModal}
        onOpenMemberActions={handleOpenMemberActions}
      />

      <CategoryActionModal
        visible={categoryActionModalOpen}
        categoryName={activeCategory?.name}
        onClose={closeCategoryActionModal}
        onCreateChannel={handleCreateChannelFromCategory}
        onEdit={handleEditCategory}
      />

      <MemberActionModal
        visible={memberActionModalOpen}
        memberName={activeMember?.name}
        grantPending={grantMemberAdminRole.isPending}
        kickPending={kickGuestMember.isPending}
        onClose={closeMemberActionModal}
        onGrantAdmin={handleGrantAdminFromModal}
        onKick={handleKickFromModal}
      />

      <LeaveServerModal
        visible={leaveConfirmModalOpen}
        isAdmin={isAdmin}
        serverName={serverName}
        leavePending={leaveServer.isPending}
        deletePending={deleteServer.isPending}
        onClose={closeLeaveConfirmModal}
        onConfirm={handleConfirmLeaveServer}
      />

      <ConfirmActionModal
        visible={kickConfirm.open}
        title="Kick member"
        message={`Kick ${kickConfirm.memberName} from ${serverName}?`}
        confirmLabel="Kick"
        confirmIcon="person-remove-outline"
        onConfirm={handleConfirmKick}
        confirmPending={kickGuestMember.isPending}
        onCancel={closeKickConfirm}
      />

      <AppDialogModal
        visible={simpleDialog.open}
        title={simpleDialog.title}
        message={simpleDialog.message}
        onClose={closeDialog}
      />
    </View>
  );
}
