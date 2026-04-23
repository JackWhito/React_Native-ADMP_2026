import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import {
  useChannelMessages,
  useDeleteChannelMessage,
  useReactToChannelMessage,
  useReportChannelMessage,
  useSendChannelMessage,
  useUpdateChannelMessage,
} from "@/hooks/useChannelMessages";
import {
  useDeleteDirectMessage,
  useDirectMessages,
  useReactToDirectMessage,
  useReportDirectMessage,
  useSendDirectMessage,
  useUpdateDirectMessage,
} from "@/hooks/useDirectMessages";
import { useAddFriendByName, useSharedServers } from "@/hooks/useFriend";
import { useGetOrCreateConversation } from "@/hooks/useChat";
import type { ChannelMessage, ChannelMessageMember, Chat, DirectMessage } from "@/types";
import * as ImagePicker from "expo-image-picker";
import { EmojiPickerModal, emojiData } from "@hiraku-ai/react-native-emoji-picker";
import * as Clipboard from "expo-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockUser, useMyProfile, useReportUser } from "@/hooks/useProfile";

export type ChatDetailTarget =
  | { kind: "dm"; id: string; name: string; imageUrl?: string; userId?: string; username?: string }
  | {
      kind: "channel";
      id: string;
      channelName: string;
      serverId: string;
      serverName: string;
    };

export function ChatDetailContent({
  target,
  onClose,
  closeIcon = "chevron-down",
}: {
  target: ChatDetailTarget;
  onClose: () => void;
  closeIcon?: "chevron-down" | "chevron-back";
}) {
  type ChatMessageItem = ChannelMessage | DirectMessage;
  type ReportCategory = "spam" | "harassment" | "hate" | "nudity" | "violence" | "scam" | "other";
  const isChannel = target.kind === "channel";
  const [draft, setDraft] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string>("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [messageActionOpen, setMessageActionOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{
    id: string;
    text: string;
    sender: string;
    isMine: boolean;
    replyMeta?: { sender: string; text: string } | null;
  } | null>(null);
  const [replyTarget, setReplyTarget] = useState<{
    id: string;
    sender: string;
    text: string;
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyMeta, setEditingReplyMeta] = useState<{ sender: string; text: string } | null>(null);
  const [reportStatusText, setReportStatusText] = useState("");
  const [reportReasonOpen, setReportReasonOpen] = useState(false);
  const [selectedReportCategory, setSelectedReportCategory] = useState<ReportCategory>("other");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; text: string } | null>(null);
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState<{
    name: string;
    username?: string;
    imageUrl?: string;
    id?: string;
  } | null>(null);
  const [profileActionOpen, setProfileActionOpen] = useState(false);
  const [profileReportOpen, setProfileReportOpen] = useState(false);
  const [profileReportCategory, setProfileReportCategory] = useState<ReportCategory>("other");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const myUserId = user?.id ? String(user.id) : "";
  const channelId = target.kind === "channel" ? target.id : null;
  const conversationId = target.kind === "dm" ? target.id : null;
  const {
    data: channelMessages,
    isLoading: isLoadingChannelMessages,
    isRefetching: isRefetchingChannelMessages,
    error: channelMessagesError,
    hasOlderMessages: hasOlderChannelMessages,
    isLoadingOlderMessages: isLoadingOlderChannelMessages,
    loadOlderMessages: loadOlderChannelMessages,
    typingUsers,
    onlineUserIds,
    setTyping,
    sendViaSocket,
  } = useChannelMessages(channelId);
  const {
    data: directMessages,
    isLoading: isLoadingDirectMessages,
    isRefetching: isRefetchingDirectMessages,
    error: directMessagesError,
    hasOlderMessages: hasOlderDirectMessages,
    isLoadingOlderMessages: isLoadingOlderDirectMessages,
    loadOlderMessages: loadOlderDirectMessages,
    sendViaSocket: sendDirectViaSocket,
  } = useDirectMessages(conversationId);
  const sendChannelMessage = useSendChannelMessage(channelId, sendViaSocket);
  const updateChannelMessage = useUpdateChannelMessage(channelId);
  const deleteChannelMessage = useDeleteChannelMessage(channelId);
  const reportChannelMessage = useReportChannelMessage(channelId);
  const sendDirectMessage = useSendDirectMessage(conversationId, sendDirectViaSocket);
  const updateDirectMessage = useUpdateDirectMessage(conversationId);
  const deleteDirectMessage = useDeleteDirectMessage(conversationId);
  const reportDirectMessage = useReportDirectMessage(conversationId);
  const reactToChannelMessage = useReactToChannelMessage(channelId);
  const reactToDirectMessage = useReactToDirectMessage(conversationId);
  const addFriendByName = useAddFriendByName();
  const getOrCreateConversation = useGetOrCreateConversation();
  const { data: myProfile } = useMyProfile();
  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const cachedConversations = queryClient.getQueryData<Chat[]>(["conversations"]);
  const cachedConversation = useMemo(
    () => cachedConversations?.find((item) => String(item._id) === String(conversationId ?? "")) ?? null,
    [cachedConversations, conversationId]
  );
  const dmOtherName = target.kind === "dm" ? (target.name?.trim() || cachedConversation?.member?.name || "Member") : "";
  const dmOtherUsername = target.kind === "dm"
    ? (target.username?.trim() || String(cachedConversation?.member?.username ?? "").trim() || "")
    : "";
  const dmOtherImage = target.kind === "dm"
    ? (target.imageUrl?.trim() || String(cachedConversation?.member?.imageUrl ?? "").trim() || "")
    : "";
  const dmOtherProfileId = target.kind === "dm"
    ? (target.userId?.trim() || String(cachedConversation?.member?._id ?? "").trim() || "")
    : "";
  const { data: sharedServersData } = useSharedServers(dmOtherProfileId || null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const title =
    target.kind === "channel" ? `#${target.channelName}` : target.name;
  const subtitle =
    target.kind === "channel"
      ? `${target.serverName} · text channel`
      : "";

  const openChannelInfo = useCallback(() => {
    if (target.kind !== "channel") return;
    router.push({
      pathname: "/channel-info/[id]",
      params: {
        id: target.id,
        channelName: target.channelName,
        serverId: target.serverId,
        serverName: target.serverName,
      },
    });
  }, [router, target]);

  const orderedChannelMessages = useMemo(
    () => (Array.isArray(channelMessages) ? channelMessages : []),
    [channelMessages]
  );
  const orderedDirectMessages = useMemo(
    () => (Array.isArray(directMessages) ? directMessages : []),
    [directMessages]
  );
  const orderedMessages = isChannel ? orderedChannelMessages : orderedDirectMessages;

  const isLoadingMessages = isChannel ? isLoadingChannelMessages : isLoadingDirectMessages;
  const isRefetchingMessages = isChannel ? isRefetchingChannelMessages : isRefetchingDirectMessages;
  const messagesError = isChannel ? channelMessagesError : directMessagesError;
  const hasOlderMessages = isChannel ? hasOlderChannelMessages : hasOlderDirectMessages;
  const isLoadingOlderMessages = isChannel
    ? isLoadingOlderChannelMessages
    : isLoadingOlderDirectMessages;
  const loadOlderMessages = isChannel ? loadOlderChannelMessages : loadOlderDirectMessages;
  const channelEmptyState = !isLoadingMessages && !orderedMessages.length;
  const channelErrorText =
    (messagesError as any)?.response?.data?.error ||
    (messagesError as Error | undefined)?.message ||
    "Could not load messages.";

  const getMemberFromMessage = useCallback((message: ChatMessageItem): ChannelMessageMember | null => {
    if (!message.member || typeof message.member === "string") return null;
    return message.member;
  }, []);

  const isMyMessage = useCallback((message: ChatMessageItem) => {
    if (!myUserId) return false;
    if (typeof message.member === "string") {
      return message.member === myUserId;
    }
    const profileId = String(message.member?._id ?? "");
    const clerkId = String(message.member?.clerkId ?? "");
    return profileId === myUserId || clerkId === myUserId;
  }, [myUserId]);

  const formatTime = useCallback((isoDate?: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatSentLabel = useCallback((isoDate?: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.toLocaleDateString("en-GB");
    const time = formatTime(isoDate);
    return `${day} · ${time}`;
  }, [formatTime]);

  const getAvatarUrl = useCallback((member: ChannelMessageMember | null) => {
    return member?.imageUrl?.trim() || "";
  }, []);

  const getAvatarFallback = useCallback((name?: string) => {
    const value = (name ?? "").trim();
    if (!value) return "?";
    return value.charAt(0).toUpperCase();
  }, []);

  const openProfilePreview = useCallback((member: ChannelMessageMember | null, fallbackName: string) => {
    const displayName = (member?.name || member?.username || fallbackName || "Member").trim();
    setProfileActionOpen(false);
    setProfileReportOpen(false);
    setProfilePreview({
      name: displayName,
      username: member?.username?.trim() || undefined,
      imageUrl: member?.imageUrl?.trim() || undefined,
      id: member?._id || undefined,
    });
  }, []);

  const openDmHeaderProfilePreview = useCallback(() => {
    if (target.kind !== "dm") return;
    setProfileActionOpen(false);
    setProfileReportOpen(false);
    setProfilePreview({
      name: (target.name || dmOtherName || "Member").trim(),
      username: target.username?.trim() || dmOtherUsername || undefined,
      imageUrl: target.imageUrl?.trim() || dmOtherImage || undefined,
      id: target.userId?.trim() || dmOtherProfileId || undefined,
    });
  }, [dmOtherImage, dmOtherProfileId, dmOtherName, dmOtherUsername, target]);

  const parseReplyPayload = useCallback((content: string) => {
    const match = /^↪\s(.+?):\s(.+?)\n([\s\S]*)$/.exec(content);
    if (!match) return null;
    return {
      replyName: match[1].trim(),
      replyText: match[2].trim(),
      body: match[3],
    };
  }, []);

  const renderMentionText = useCallback((content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
    return (
      <Text className="text-sm text-zinc-100">
        {parts.map((part, index) => {
          const isMention = /^@[a-zA-Z0-9_.-]+$/.test(part);
          if (isMention) {
            return (
              <Text key={`${part}-${index}`} className="text-[#5865F2] font-semibold">
                {part}
              </Text>
            );
          }
          return <Text key={`${part}-${index}`}>{part}</Text>;
        })}
      </Text>
    );
  }, []);

  const pickImage = useCallback(async (allowsEditing: boolean) => {
    if (sendChannelMessage.isPending || sendDirectMessage.isPending) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing,
        quality: 0.75,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      if (asset.base64) {
        const mimeType = asset.mimeType || "image/jpeg";
        setPendingImageUrl(`data:${mimeType};base64,${asset.base64}`);
        return;
      }
      if (asset.uri) {
        setPendingImageUrl(asset.uri);
      }
    } catch {
      // No-op; send error UI will still reflect request issues only.
    }
  }, [sendChannelMessage.isPending, sendDirectMessage.isPending]);

  const handlePickImage = async () => {
    await pickImage(false);
  };

  const handleEditPickedImage = useCallback(() => {
    void pickImage(true);
  }, [pickImage]);

  const handleSendMessage = async () => {
    const content = draft.trim();
    const fileUrl = pendingImageUrl.trim();
    const isSending = isChannel ? sendChannelMessage.isPending : sendDirectMessage.isPending;
    if ((!content && !fileUrl) || isSending) return;
    if (editingMessageId) {
      if (!content) return;
      const editedContent = editingReplyMeta
        ? `↪ ${editingReplyMeta.sender}: ${editingReplyMeta.text}\n${content}`
        : content;
      try {
        if (isChannel) {
          await updateChannelMessage.mutateAsync({ messageId: editingMessageId, content: editedContent });
        } else {
          await updateDirectMessage.mutateAsync({ messageId: editingMessageId, content: editedContent });
        }
        setDraft("");
        setEditingMessageId(null);
        setEditingReplyMeta(null);
      } catch {
        // Error handled by mutation state in composer.
      }
      return;
    }

    const finalContent = replyTarget
      ? `↪ ${replyTarget.sender}: ${replyTarget.text}\n${content}`
      : content;
    const previousDraft = draft;
    const previousImage = pendingImageUrl;
    const previousReplyTarget = replyTarget;

    try {
      setTyping(false);
      // Clear composer immediately so send feels instant.
      setDraft("");
      setPendingImageUrl("");
      setEmojiPickerOpen(false);
      setReplyTarget(null);
      if (isChannel) {
        await sendChannelMessage.mutateAsync({ content: finalContent, fileUrl });
      } else {
        await sendDirectMessage.mutateAsync({ content: finalContent, fileUrl });
      }
    } catch {
      // Restore composer state if sending fails.
      setDraft(previousDraft);
      setPendingImageUrl(previousImage);
      setReplyTarget(previousReplyTarget);
    }
  };

  const openMessageActions = useCallback((
    message: ChatMessageItem,
    text: string,
    sender: string,
    mine: boolean,
    replyMeta?: { sender: string; text: string } | null
  ) => {
    setSelectedMessage({
      id: String(message._id),
      text,
      sender,
      isMine: mine,
      replyMeta: replyMeta ?? null,
    });
    setMessageActionOpen(true);
  }, []);

  const closeMessageActions = () => {
    setMessageActionOpen(false);
    setSelectedMessage(null);
    setHighlightedMessageId(null);
  };

  const handleCopyMessage = async () => {
    if (!selectedMessage?.text) return;
    await Clipboard.setStringAsync(selectedMessage.text);
    closeMessageActions();
  };

  const handleReplyMessage = () => {
    if (!selectedMessage) return;
    setReplyTarget({
      id: selectedMessage.id,
      sender: selectedMessage.sender,
      text: selectedMessage.text,
    });
    closeMessageActions();
  };

  const triggerQuickReply = useCallback((message: { id: string; sender: string; text: string }) => {
    if (!message.text.trim()) return;
    setReplyTarget({
      id: message.id,
      sender: message.sender,
      text: message.text,
    });
    setEditingMessageId(null);
    setEditingReplyMeta(null);
  }, []);

  const triggerQuickEdit = useCallback((message: {
    id: string;
    text: string;
    replyMeta?: { sender: string; text: string } | null;
  }) => {
    if (!message.text.trim()) return;
    setEditingMessageId(message.id);
    setDraft(message.text);
    setReplyTarget(null);
    setEditingReplyMeta(message.replyMeta ?? null);
  }, []);

  const handleEditMessage = () => {
    if (!selectedMessage?.isMine) return;
    setEditingMessageId(selectedMessage.id);
    setDraft(selectedMessage.text);
    setReplyTarget(null);
    setEditingReplyMeta(selectedMessage.replyMeta ?? null);
    closeMessageActions();
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage?.isMine) return;
    setDeleteTarget({ id: selectedMessage.id, text: selectedMessage.text });
    setDeleteConfirmOpen(true);
    setMessageActionOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      if (isChannel) {
        await deleteChannelMessage.mutateAsync(deleteTarget.id);
      } else {
        await deleteDirectMessage.mutateAsync(deleteTarget.id);
      }
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      closeMessageActions();
    } catch {
      // Error handled by mutation state in composer.
    }
  };

  const handleAddFriendFromProfile = async () => {
    const username = profilePreview?.username?.trim();
    if (!username) {
      setReportStatusText("This account has no username to add.");
      return;
    }
    try {
      await addFriendByName.mutateAsync(username);
      setReportStatusText("Friend invite sent.");
      setProfilePreview(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ?? error?.message ?? "Could not send friend invite.";
      setReportStatusText(String(message));
    }
  };

  const handleChatFromProfile = () => {
    if (target.kind === "dm") {
      setProfilePreview(null);
      return;
    }
    const targetId = String(profilePreview?.id ?? "").trim();
    if (!targetId) {
      setReportStatusText("Could not start chat for this account.");
      return;
    }
    getOrCreateConversation
      .mutateAsync(targetId)
      .then((conversation) => {
        setProfilePreview(null);
        const conversationId = String((conversation as any)?._id ?? "").trim();
        if (!conversationId) {
          setReportStatusText("Could not open chat.");
          return;
        }
        router.push(`/chat/${conversationId}` as never);
      })
      .catch((error: any) => {
        const message =
          error?.response?.data?.error ?? error?.message ?? "Could not start chat.";
        setReportStatusText(String(message));
      });
  };

  const handleCopyProfileUsername = async () => {
    const username = profilePreview?.username?.trim();
    if (!username) {
      setReportStatusText("No username available to copy.");
      setProfileActionOpen(false);
      return;
    }
    await Clipboard.setStringAsync(`@${username}`);
    setReportStatusText("Username copied.");
    setProfileActionOpen(false);
  };

  const handleReportProfile = () => {
    const targetProfileId = String(profilePreview?.id ?? "").trim();
    if (!targetProfileId) {
      setReportStatusText("Could not report this account.");
      setProfileActionOpen(false);
      return;
    }
    setProfileReportCategory("other");
    setProfileReportOpen(true);
    setProfileActionOpen(false);
  };

  const submitProfileReport = async () => {
    const targetProfileId = String(profilePreview?.id ?? "").trim();
    if (!targetProfileId) {
      setReportStatusText("Could not report this account.");
      setProfileReportOpen(false);
      return;
    }
    try {
      const response = await reportUser.mutateAsync({
        profileId: targetProfileId,
        reason: reportReasonText[profileReportCategory],
        category: profileReportCategory,
      });
      setReportStatusText(response.duplicate ? "You already reported this user." : "User report submitted.");
    } catch (error: any) {
      const message =
        error?.response?.data?.error ?? error?.message ?? "Could not submit user report.";
      setReportStatusText(String(message));
    }
    setProfileReportOpen(false);
  };

  const handleBlockProfile = async () => {
    const targetProfileId = String(profilePreview?.id ?? "").trim();
    if (!targetProfileId) {
      setReportStatusText("Could not block this account.");
      setProfileActionOpen(false);
      return;
    }
    try {
      const response = await blockUser.mutateAsync({ profileId: targetProfileId });
      setReportStatusText(response.alreadyBlocked ? "User is already blocked." : "User has been blocked.");
      setProfilePreview(null);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Could not block user.";
      setReportStatusText(String(message));
    }
    setProfileActionOpen(false);
  };

  const handleReportMessage = async () => {
    if (!selectedMessage || selectedMessage.isMine) return;
    setSelectedReportCategory("other");
    setReportReasonOpen(true);
  };

  const handleReactFromModal = () => {
    if (!selectedMessage) return;
    setReactionTargetMessageId(selectedMessage.id);
    setEmojiPickerOpen(true);
    closeMessageActions();
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!messageId || !emoji.trim()) return;
    try {
      if (isChannel) {
        await reactToChannelMessage.mutateAsync({ messageId, emoji });
      } else {
        await reactToDirectMessage.mutateAsync({ messageId, emoji });
      }
    } catch {
      setReportStatusText("Could not update reaction.");
    }
  };

  const reportReasonText: Record<ReportCategory, string> = {
    spam: "Spam or misleading content",
    harassment: "Harassment or bullying",
    hate: "Hate speech or symbols",
    nudity: "Nudity or sexual content",
    violence: "Violence or dangerous content",
    scam: "Scam, fraud, or phishing",
    other: "Other community guideline violation",
  };

  const submitReport = async () => {
    if (!selectedMessage) return;
    try {
      const reason = reportReasonText[selectedReportCategory];
      const result = isChannel
        ? await reportChannelMessage.mutateAsync({
            messageId: selectedMessage.id,
            reason,
            category: selectedReportCategory,
          })
        : await reportDirectMessage.mutateAsync({
            messageId: selectedMessage.id,
            reason,
            category: selectedReportCategory,
          });
      setReportStatusText(
        result.duplicate ? "You already reported this message." : "Report submitted. Thanks."
      );
      setReportReasonOpen(false);
      closeMessageActions();
    } catch {
      setReportStatusText("Could not submit report.");
      setReportReasonOpen(false);
      closeMessageActions();
    }
  };

  useEffect(() => {
    if (!isChannel) return;
    const hasDraft = !!draft.trim();

    if (!hasDraft) {
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      typingTimeoutRef.current = null;
    }, 1200);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [draft, isChannel, setTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(false);
    };
  }, [setTyping]);

  useEffect(() => {
    if (!reportStatusText) return;
    const timer = setTimeout(() => setReportStatusText(""), 2800);
    return () => clearTimeout(timer);
  }, [reportStatusText]);

  useEffect(() => {
    if (!highlightedMessageId || messageActionOpen) return;
    const timer = setTimeout(() => setHighlightedMessageId(null), 450);
    return () => clearTimeout(timer);
  }, [highlightedMessageId, messageActionOpen]);

  const typingLabel = useMemo(() => {
    if (!typingUsers?.length) return "";
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    return `${typingUsers.length} people are typing...`;
  }, [typingUsers]);

  const channelOnlineCount = useMemo(() => {
    if (!isChannel) return 0;
    const onlineIdSet = new Set(onlineUserIds.map(String));
    const memberIds = new Set<string>();
    for (const msg of orderedMessages) {
      const member = getMemberFromMessage(msg);
      const id = String(member?._id ?? "").trim();
      if (id) memberIds.add(id);
    }
    let count = 0;
    memberIds.forEach((id) => {
      if (onlineIdSet.has(id)) count += 1;
    });
    return count;
  }, [isChannel, orderedMessages, getMemberFromMessage, onlineUserIds]);

  const mentionCandidates = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; username?: string; imageUrl?: string }>();
    for (const msg of orderedMessages) {
      const member = getMemberFromMessage(msg);
      if (!member?._id) continue;
      const id = String(member._id);
      const name = String(member.name || member.username || "").trim();
      if (!name) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name,
          username: member.username?.trim() || undefined,
          imageUrl: member.imageUrl?.trim() || undefined,
        });
      }
    }
    if (myProfile?._id) {
      const id = String(myProfile._id);
      if (!byId.has(id)) {
        const fallbackName = String(myProfile.name || myProfile.username || "You").trim();
        byId.set(id, {
          id,
          name: fallbackName || "You",
          username: myProfile.username?.trim() || undefined,
          imageUrl: myProfile.imageUrl?.trim() || undefined,
        });
      }
    }
    return [...byId.values()];
  }, [orderedMessages, getMemberFromMessage, myProfile]);

  const mentionQuery = useMemo(() => {
    if (!draft) return "";
    const match = /(?:^|\s)@([a-zA-Z0-9_.-]*)$/.exec(draft);
    return match ? (match[1] ?? "") : "";
  }, [draft]);

  const filteredMentionCandidates = useMemo(() => {
    if (!isChannel) return [];
    const q = mentionQuery.toLowerCase();
    const list = mentionCandidates.filter((candidate) => {
      const name = candidate.name.toLowerCase();
      const username = String(candidate.username ?? "").toLowerCase();
      return !q || name.includes(q) || username.includes(q);
    });
    return list.slice(0, 6);
  }, [isChannel, mentionQuery, mentionCandidates]);

  useEffect(() => {
    if (!isChannel) {
      setMentionMenuOpen(false);
      return;
    }
    const hasMentionPattern = /(?:^|\s)@[a-zA-Z0-9_.-]*$/.test(draft);
    if (!hasMentionPattern) {
      setMentionMenuOpen(false);
      return;
    }
    setMentionMenuOpen(filteredMentionCandidates.length > 0);
  }, [draft, filteredMentionCandidates.length, isChannel]);

  const insertMention = (candidate: { name: string; username?: string }) => {
    const handle = (candidate.username?.trim() || candidate.name.trim()).replace(/\s+/g, "_");
    if (!handle) return;
    setDraft((prev) => prev.replace(/(?:^|\s)@[a-zA-Z0-9_.-]*$/, (m) => `${m.startsWith(" ") ? " " : ""}@${handle} `));
    setMentionMenuOpen(false);
  };

  const replyAvatarByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of orderedMessages) {
      const member = getMemberFromMessage(msg);
      const displayName = (member?.name || member?.username || "").trim();
      const avatar = member?.imageUrl?.trim() || "";
      if (displayName && avatar && !map.has(displayName)) {
        map.set(displayName, avatar);
      }
    }
    return map;
  }, [orderedMessages, getMemberFromMessage]);

  const renderChannelMessage = useCallback(({ item }: { item: ChatMessageItem }) => {
    const mine = isMyMessage(item);
    const member = getMemberFromMessage(item);
    const displayName =
      member?.name ||
      member?.username ||
      (mine ? (myProfile?.name || myProfile?.username || "You") : "Member");
    const time = formatSentLabel(item.createdAt);
    const deleted = Boolean(item.deleted);
    const overriddenText = item.content;
    const parsedReply = deleted ? null : parseReplyPayload(overriddenText);
    const text = deleted
      ? "Message deleted"
      : parsedReply
        ? parsedReply.body
        : overriddenText;
    const visibleText = deleted ? "" : text;
    const avatarUrl = getAvatarUrl(member) || (mine ? (myProfile?.imageUrl?.trim() || "") : "");
    const messageId = String(item._id);
    const reactions = Array.isArray((item as any).reactions) ? (item as any).reactions : [];
    const myProfileId = String(myProfile?._id ?? "").trim();
    const showImage = !deleted && !!item.fileUrl?.trim();
    const normalizedText = String(text ?? "").trim();
    const isEmojiOnlyMessage =
      !showImage &&
      !!normalizedText &&
      !parsedReply &&
      /^\p{Emoji}[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\uFE0F\s]*$/u.test(
        normalizedText
      );
    const canQuickReply = !deleted && !!normalizedText;

    const messageCard = (
      <Pressable
        onPressIn={() => setHighlightedMessageId(messageId)}
        onLongPress={() => {
          setHighlightedMessageId(messageId);
          openMessageActions(
            item,
            text,
            displayName,
            mine,
            parsedReply
              ? { sender: parsedReply.replyName, text: parsedReply.replyText }
              : null
          );
        }}
        delayLongPress={280}
        className={`mb-4 flex-row justify-start rounded-lg px-2 py-1 ${
          highlightedMessageId === messageId
            ? "bg-white/10"
            : ""
        }`}
      >
        <Pressable
          className="mr-2 mt-1 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-700"
          onPress={() => openProfilePreview(member, displayName)}
          hitSlop={8}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ height: 40, width: 40 }} resizeMode="cover" />
          ) : (
            <Text className="text-zinc-100 text-sm font-semibold">{getAvatarFallback(displayName)}</Text>
          )}
        </Pressable>
        <View className="max-w-[82%] items-start">
          <View className="mb-1 flex-row items-center">
            <Text className="text-zinc-400 text-xs">{displayName}</Text>
            {!!time ? <Text className="text-zinc-500 text-[11px] ml-2">{time}</Text> : null}
          </View>
          {isEmojiOnlyMessage ? (
            <Text className="text-[42px] leading-[50px]">{normalizedText}</Text>
          ) : (
            <View className="py-1 rounded-md">
              {deleted ? (
                <View className="flex-row items-center rounded-md bg-zinc-800/70 px-2.5 py-2 border border-zinc-700/60">
                  <Ionicons name="remove-circle-outline" size={14} color="#9CA3AF" />
                  <Text className="ml-1.5 text-xs italic text-zinc-400">Message deleted</Text>
                </View>
              ) : parsedReply ? (
                <View className="mb-2 rounded-md border-l-2 border-zinc-500/80 pl-2 py-0.5">
                  <View className="flex-row items-center">
                    <View className="mr-1.5 h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-zinc-700">
                      {replyAvatarByName.get(parsedReply.replyName) ? (
                        <Image
                          source={{ uri: replyAvatarByName.get(parsedReply.replyName) }}
                          style={{ width: 16, height: 16 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-[9px] text-zinc-100">
                          {getAvatarFallback(parsedReply.replyName)}
                        </Text>
                      )}
                    </View>
                    <Text className="text-[11px] font-semibold text-zinc-200">
                      {parsedReply.replyName}
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-[11px] text-zinc-300" numberOfLines={1}>
                    {parsedReply.replyText}
                  </Text>
                </View>
              ) : null}
              {showImage ? (
                <Pressable onPress={() => setFullImageUrl(item.fileUrl ?? null)}>
                  <Image
                    source={{ uri: item.fileUrl }}
                      style={{ width: 210, height: 210, borderRadius: 10, marginBottom: visibleText ? 8 : 0 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : null}
              {!!visibleText ? renderMentionText(visibleText) : null}
            </View>
          )}
          {!!reactions.length ? (
            <View className="mt-2 flex-row flex-wrap">
              {reactions.map((reaction: any) => {
                const users = Array.isArray(reaction?.users) ? reaction.users.map(String) : [];
                const count = users.length;
                if (!reaction?.emoji || count <= 0) return null;
                const reactedByMe = !!myProfileId && users.includes(myProfileId);
                return (
                  <Pressable
                    key={`${messageId}-${reaction.emoji}`}
                    onPress={() => handleReactToMessage(messageId, String(reaction.emoji))}
                    className={`mr-1.5 mb-1 rounded-full px-2 py-1 border ${
                      reactedByMe
                        ? "border-indigo-300/70 bg-indigo-500/20"
                        : "border-zinc-700 bg-zinc-800/70"
                    }`}
                  >
                    <Text className="text-xs text-zinc-100">
                      {reaction.emoji} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </Pressable>
    );

    if (!canQuickReply) return messageCard;

    return (
      <Swipeable
        friction={2.2}
        rightThreshold={44}
        overshootRight={false}
        renderRightActions={() => (
          <View className="mb-4 mr-1 items-center justify-center rounded-lg bg-indigo-500/20 px-3">
            <Ionicons
              name={mine ? "create-outline" : "arrow-undo-outline"}
              size={16}
              color="#C7D2FE"
            />
            <Text className="mt-0.5 text-[10px] font-semibold text-indigo-200">
              {mine ? "Edit" : "Reply"}
            </Text>
          </View>
        )}
        onSwipeableOpen={(direction) => {
          if (direction !== "right") return;
          if (mine) {
            triggerQuickEdit({
              id: messageId,
              text,
              replyMeta: parsedReply
                ? { sender: parsedReply.replyName, text: parsedReply.replyText }
                : null,
            });
          } else {
            triggerQuickReply({ id: messageId, sender: displayName, text });
          }
          setHighlightedMessageId(messageId);
          swipeableRefs.current[messageId]?.close();
        }}
        ref={(ref) => {
          swipeableRefs.current[messageId] = ref;
        }}
      >
        {messageCard}
      </Swipeable>
    );
  }, [
    getAvatarFallback,
    getAvatarUrl,
    getMemberFromMessage,
    handleReactToMessage,
    highlightedMessageId,
    isMyMessage,
    myProfile?._id,
    openMessageActions,
    openProfilePreview,
    parseReplyPayload,
    renderMentionText,
    replyAvatarByName,
    setFullImageUrl,
    triggerQuickEdit,
    triggerQuickReply,
  ]);

  return (
    <View className="flex-1">
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={onClose} className="mr-3 active:opacity-70" hitSlop={8}>
          <Ionicons name={closeIcon} size={22} color="white" />
        </Pressable>
        <View className="flex-1">
          {target.kind === "dm" ? (
            <Pressable className="flex-row items-center active:opacity-80" onPress={openDmHeaderProfilePreview}>
              <View className="mr-2 h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-700">
                {target.imageUrl ? (
                  <Image
                    source={{ uri: target.imageUrl }}
                    style={{ width: 32, height: 32 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-zinc-100 text-xs font-semibold">
                    {getAvatarFallback(target.name)}
                  </Text>
                )}
              </View>
              <Text className="text-white text-base font-semibold" numberOfLines={1}>
                {target.name}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={openChannelInfo} className="active:opacity-80">
              <Text className="text-white text-base font-semibold" numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                {channelOnlineCount} currently online
              </Text>
            </Pressable>
          )}
        </View>
        {target.kind === "channel" ? (
          <Pressable className="ml-2 rounded-full p-2 active:opacity-70" hitSlop={8}>
            <Ionicons name="search-outline" size={18} color="#A1A1AA" />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <KeyboardAvoidingView
          behavior={undefined}
          className="flex-1 w-full"
        >
            {isLoadingMessages ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#A1A1AA" />
              </View>
            ) : messagesError ? (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="warning-outline" size={20} color="#F87171" />
                <Text className="text-red-400 text-sm text-center mt-2">{channelErrorText}</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={orderedMessages}
                  keyExtractor={(item) => item._id}
                  renderItem={renderChannelMessage}
                  inverted
                  initialNumToRender={14}
                  maxToRenderPerBatch={8}
                  updateCellsBatchingPeriod={60}
                  windowSize={7}
                  removeClippedSubviews={Platform.OS === "android"}
                  maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                  onEndReachedThreshold={0.4}
                  onEndReached={() => {
                    if (!hasOlderMessages || isLoadingOlderMessages) return;
                    void loadOlderMessages();
                  }}
                  contentContainerStyle={{
                    paddingTop: 12,
                    paddingBottom: 16,
                    flexGrow: 1,
                  }}
                  className="flex-1"
                  showsVerticalScrollIndicator={false}
                  ListFooterComponent={
                    <>
                      {target.kind === "dm" && !hasOlderMessages ? (
                        <View className="items-center py-4 px-3">
                          <View className="h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-full bg-zinc-700">
                            {dmOtherImage ? (
                              <Image source={{ uri: dmOtherImage }} style={{ width: 78, height: 78 }} resizeMode="cover" />
                            ) : (
                              <Text className="text-zinc-100 text-2xl font-semibold">
                                {getAvatarFallback(dmOtherName)}
                              </Text>
                            )}
                          </View>
                          <Text className="mt-3 text-zinc-100 text-lg font-semibold">{dmOtherName}</Text>
                          {!!dmOtherUsername ? (
                            <Text className="mt-1 text-zinc-400 text-base">@{dmOtherUsername}</Text>
                          ) : null}
                          <Text className="mt-2 text-zinc-300 text-sm text-center">
                            This is the start of a legendary chat between you and {dmOtherName}.
                          </Text>
                          {!!sharedServersData?.servers?.length ? (
                            <View className="mt-3 items-center">
                              <View className="flex-row items-center">
                                {sharedServersData.servers.slice(0, 3).map((server, index) => (
                                  <View
                                    key={server._id}
                                    className={`h-8 w-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-700 ${
                                      index > 0 ? "-ml-2.5" : ""
                                    }`}
                                  >
                                    {server.imageUrl ? (
                                      <Image
                                        source={{ uri: server.imageUrl }}
                                        style={{ width: 32, height: 32 }}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <View className="h-full w-full items-center justify-center">
                                        <Text className="text-zinc-200 text-[10px] font-semibold">
                                          {getAvatarFallback(server.name)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                ))}
                              </View>
                              <Text className="mt-1.5 text-zinc-400 text-sm">
                                {sharedServersData.servers.length} same server
                                {sharedServersData.servers.length > 1 ? "s" : ""}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                      {target.kind === "channel" && !hasOlderMessages ? (
                        <View className="items-center py-4 px-3">
                          <View className="h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-full bg-zinc-700">
                            <Ionicons name="chatbubble-ellipses-outline" size={34} color="#E4E4E7" />
                          </View>
                          <Text className="mt-3 text-zinc-100 text-lg font-semibold">
                            Welcome to #{target.channelName}!
                          </Text>
                          <Text className="mt-2 text-zinc-300 text-sm text-center">
                            This is a new beginning of channel #{target.channelName}.
                          </Text>
                        </View>
                      ) : null}
                      {hasOlderMessages ? (
                        <View className="items-center py-2">
                          <Text className="text-zinc-500 text-xs">
                            {isLoadingOlderMessages
                              ? "Loading older messages..."
                              : "Scroll for older messages"}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  }
                  ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-12">
                      <Ionicons name="chatbubble-ellipses-outline" size={24} color="#71717A" />
                      <Text className="text-zinc-400 text-sm mt-2 text-center">
                        {channelEmptyState
                          ? "No messages yet. Start the conversation."
                          : "No visible messages."}
                      </Text>
                    </View>
                  }
                />
                <View className="border-t border-zinc-800 pt-3 pb-2">
                  {!!typingLabel ? (
                    <Text className="text-zinc-400 text-xs mb-2">{typingLabel}</Text>
                  ) : null}
                  {replyTarget ? (
                    <View className="mb-2 flex-row items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5">
                      <Text className="text-zinc-300 text-xs flex-1" numberOfLines={1}>
                        Replying to {replyTarget.sender}: {replyTarget.text}
                      </Text>
                      <Pressable onPress={() => setReplyTarget(null)} className="ml-2">
                        <Ionicons name="close" size={14} color="#A1A1AA" />
                      </Pressable>
                    </View>
                  ) : null}
                  {editingMessageId ? (
                    <View className="mb-2 flex-row items-center justify-between rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1.5">
                      <Text className="text-indigo-200 text-xs flex-1" numberOfLines={1}>
                        Editing message
                      </Text>
                      <Pressable
                        onPress={() => {
                          setEditingMessageId(null);
                          setEditingReplyMeta(null);
                          setDraft("");
                        }}
                        className="ml-2"
                      >
                        <Ionicons name="close" size={14} color="#C7D2FE" />
                      </Pressable>
                    </View>
                  ) : null}
                  {pendingImageUrl ? (
                    <View className="mb-2">
                      <Image
                        source={{ uri: pendingImageUrl }}
                        style={{ width: 96, height: 96, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                      <View className="absolute -top-2 -right-2 flex-row items-center gap-1">
                        <Pressable
                          className="rounded-full bg-zinc-900 p-1.5"
                          onPress={handleEditPickedImage}
                        >
                          <Ionicons name="create-outline" size={12} color="#E4E4E7" />
                        </Pressable>
                        <Pressable
                          className="rounded-full bg-zinc-900 p-1.5"
                          onPress={() => setPendingImageUrl("")}
                        >
                          <Ionicons name="close" size={12} color="#E4E4E7" />
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={handleEditPickedImage}
                        className="mt-1 self-start rounded-full bg-zinc-800 px-2 py-1"
                      >
                        <Text className="text-zinc-200 text-[11px]">Edit image</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <View className="flex-row items-center bg-zinc-800 rounded-xl px-3 py-2">
                    <Pressable
                      onPress={handlePickImage}
                      disabled={sendChannelMessage.isPending || sendDirectMessage.isPending}
                      className="mr-2 rounded-full p-2 active:opacity-70"
                    >
                      <Ionicons name="image-outline" size={18} color="#A1A1AA" />
                    </Pressable>
                    <TextInput
                      className="flex-1 text-white text-sm py-1"
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={
                        target.kind === "channel"
                          ? `Message #${target.channelName}`
                          : `Message ${target.name}`
                      }
                      placeholderTextColor="#71717A"
                      multiline
                      maxLength={1800}
                    />
                    <Pressable
                      onPress={() => setEmojiPickerOpen((prev) => !prev)}
                      className="ml-2 rounded-full p-2 active:opacity-70"
                    >
                      <Ionicons
                        name={emojiPickerOpen ? "happy" : "happy-outline"}
                        size={18}
                        color={emojiPickerOpen ? "#FACC15" : "#A1A1AA"}
                      />
                    </Pressable>
                    <Pressable
                      onPress={handleSendMessage}
                      disabled={
                        sendChannelMessage.isPending ||
                        sendDirectMessage.isPending ||
                        (!draft.trim() && !pendingImageUrl.trim())
                      }
                      className="ml-2 rounded-full p-2 active:opacity-70"
                    >
                      {sendChannelMessage.isPending || sendDirectMessage.isPending ? (
                        <ActivityIndicator color="#A5B4FC" size="small" />
                      ) : (
                        <Ionicons
                          name={editingMessageId ? "checkmark" : "send"}
                          size={18}
                          color={draft.trim() || pendingImageUrl.trim() ? "#A5B4FC" : "#52525B"}
                        />
                      )}
                    </Pressable>
                  </View>
                  {mentionMenuOpen && filteredMentionCandidates.length > 0 ? (
                    <View className="mt-2 rounded-xl border border-zinc-700 bg-zinc-900/95 overflow-hidden">
                      {filteredMentionCandidates.map((candidate, index) => (
                        <Pressable
                          key={candidate.id}
                          onPress={() => insertMention(candidate)}
                          className={`px-3 py-2.5 flex-row items-center ${
                            index > 0 ? "border-t border-zinc-800" : ""
                          }`}
                        >
                          <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-zinc-700 mr-2">
                            {candidate.imageUrl ? (
                              <Image source={{ uri: candidate.imageUrl }} style={{ width: 28, height: 28 }} resizeMode="cover" />
                            ) : (
                              <Text className="text-zinc-100 text-xs font-semibold">
                                {getAvatarFallback(candidate.name)}
                              </Text>
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className="text-zinc-100 text-sm" numberOfLines={1}>
                              {candidate.name}
                            </Text>
                            {!!candidate.username ? (
                              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                                @{candidate.username}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {sendChannelMessage.isError || sendDirectMessage.isError ? (
                    <Text className="text-red-400 text-xs mt-2">
                      {((isChannel ? sendChannelMessage.error : sendDirectMessage.error) as any)?.response
                        ?.data?.error ||
                        ((isChannel
                          ? sendChannelMessage.error
                          : sendDirectMessage.error) as Error | undefined)?.message ||
                        "Could not send message."}
                    </Text>
                  ) : null}
                  {updateChannelMessage.isError || updateDirectMessage.isError ? (
                    <Text className="text-red-400 text-xs mt-2">
                      {((isChannel ? updateChannelMessage.error : updateDirectMessage.error) as any)?.response
                        ?.data?.error ||
                        ((isChannel
                          ? updateChannelMessage.error
                          : updateDirectMessage.error) as Error | undefined)?.message ||
                        "Could not edit message."}
                    </Text>
                  ) : null}
                  {deleteChannelMessage.isError || deleteDirectMessage.isError ? (
                    <Text className="text-red-400 text-xs mt-2">
                      {((isChannel ? deleteChannelMessage.error : deleteDirectMessage.error) as any)?.response
                        ?.data?.error ||
                        ((isChannel
                          ? deleteChannelMessage.error
                          : deleteDirectMessage.error) as Error | undefined)?.message ||
                        "Could not delete message."}
                    </Text>
                  ) : null}
                  {!!reportStatusText ? (
                    <Text className="text-zinc-300 text-xs mt-2">{reportStatusText}</Text>
                  ) : null}
                  {isRefetchingMessages ? (
                    <Text className="text-zinc-500 text-[11px] mt-2">Syncing messages...</Text>
                  ) : null}
                </View>
              </>
            )}
        </KeyboardAvoidingView>
      </View>
      <EmojiPickerModal
        visible={emojiPickerOpen}
        onClose={() => {
          setEmojiPickerOpen(false);
          setReactionTargetMessageId(null);
        }}
        emojis={emojiData}
        onEmojiSelect={(emoji) => {
          if (reactionTargetMessageId) {
            void handleReactToMessage(reactionTargetMessageId, emoji);
            setReactionTargetMessageId(null);
            setEmojiPickerOpen(false);
            return;
          }
          setDraft((prev) => `${prev}${emoji}`);
        }}
        showHistoryTab={false}
        showSearchBar
        darkMode
        modalTitle={reactionTargetMessageId ? "React with emoji" : "Pick an emoji"}
      />
      <Modal
        visible={!!fullImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImageUrl(null)}
      >
        <View className="flex-1 bg-black/95">
          <Pressable
            className="absolute top-12 right-5 z-10 rounded-full bg-zinc-900/90 p-2"
            onPress={() => setFullImageUrl(null)}
          >
            <Ionicons name="close" size={22} color="#F4F4F5" />
          </Pressable>
          <Pressable className="flex-1 items-center justify-center" onPress={() => setFullImageUrl(null)}>
            {fullImageUrl ? (
              <Image
                source={{ uri: fullImageUrl }}
                style={{ width: "95%", height: "80%" }}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </View>
      </Modal>
      <Modal
        visible={messageActionOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMessageActions}
      >
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-5" onPress={closeMessageActions}>
          <Pressable className="w-full max-w-[420px] rounded-2xl bg-[#15161A] border border-zinc-700 px-4 pt-3 pb-4">
            <Text className="text-zinc-300 text-xs mb-3" numberOfLines={1}>
              {selectedMessage?.text || "Message options"}
            </Text>
            <View className="rounded-xl border border-zinc-700 bg-zinc-800/70 overflow-hidden mb-2">
              <Pressable onPress={handleReplyMessage} className="px-3 py-3 active:bg-zinc-800/70">
                <Text className="text-zinc-100 text-sm">Reply</Text>
              </Pressable>
              <View className="h-px bg-zinc-800" />
              <Pressable
                onPress={handleEditMessage}
                disabled={
                  !selectedMessage?.isMine ||
                  (isChannel ? updateChannelMessage.isPending : updateDirectMessage.isPending)
                }
                className={`px-3 py-3 active:bg-zinc-800/70 ${selectedMessage?.isMine ? "" : "opacity-40"} ${
                  (isChannel ? updateChannelMessage.isPending : updateDirectMessage.isPending)
                    ? "opacity-60"
                    : ""
                }`}
              >
                <Text className="text-zinc-100 text-sm">Edit message</Text>
              </Pressable>
              <View className="h-px bg-zinc-800" />
              <Pressable onPress={handleCopyMessage} className="px-3 py-3 active:bg-zinc-800/70">
                <Text className="text-zinc-100 text-sm">Copy</Text>
              </Pressable>
            </View>

            <View className="rounded-xl border border-zinc-700 bg-zinc-800/70 overflow-hidden mb-2">
              <Pressable onPress={handleReactFromModal} className="px-3 py-3 active:bg-zinc-800/70">
                <Text className="text-zinc-100 text-sm">React</Text>
              </Pressable>
            </View>

            <View className="rounded-xl border border-zinc-700 bg-zinc-800/70 overflow-hidden">
              <Pressable
                onPress={handleReportMessage}
                disabled={!!selectedMessage?.isMine || reportChannelMessage.isPending || reportDirectMessage.isPending}
                className={`px-3 py-3 active:bg-zinc-800/70 ${selectedMessage?.isMine ? "opacity-40" : ""} ${
                  reportChannelMessage.isPending || reportDirectMessage.isPending ? "opacity-60" : ""
                }`}
              >
                <Text className="text-orange-300 text-sm">Report</Text>
              </Pressable>
              <View className="h-px bg-zinc-800" />
              <Pressable
                onPress={handleDeleteMessage}
                disabled={
                  !selectedMessage?.isMine ||
                  (isChannel ? deleteChannelMessage.isPending : deleteDirectMessage.isPending)
                }
                className={`px-3 py-3 active:bg-zinc-800/70 ${selectedMessage?.isMine ? "" : "opacity-40"} ${
                  (isChannel ? deleteChannelMessage.isPending : deleteDirectMessage.isPending)
                    ? "opacity-60"
                    : ""
                }`}
              >
                <Text className="text-red-400 text-sm">Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={reportReasonOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReportReasonOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-end"
          onPress={() => setReportReasonOpen(false)}
        >
          <Pressable
            className="w-full rounded-t-2xl bg-[#15161A] border-t border-zinc-800 px-4 pt-4 pb-5"
            onPress={() => {}}
          >
            <Text className="text-zinc-100 text-base font-semibold mb-1">Report message</Text>
            <Text className="text-zinc-400 text-xs mb-3">
              Select a reason. This helps moderators review faster.
            </Text>
            {(Object.keys(reportReasonText) as ReportCategory[]).map((category) => {
              const selected = selectedReportCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedReportCategory(category)}
                  className={`py-3 px-2 rounded-lg mb-1 border ${
                    selected ? "border-orange-300 bg-orange-300/10" : "border-transparent"
                  }`}
                >
                  <Text className={`text-sm ${selected ? "text-orange-200" : "text-zinc-100"}`}>
                    {reportReasonText[category]}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={submitReport}
              disabled={reportChannelMessage.isPending || reportDirectMessage.isPending}
              className={`mt-3 rounded-lg py-3 ${
                reportChannelMessage.isPending || reportDirectMessage.isPending
                  ? "bg-zinc-700"
                  : "bg-orange-500"
              }`}
            >
              <Text className="text-white text-sm text-center font-semibold">
                {reportChannelMessage.isPending || reportDirectMessage.isPending
                  ? "Submitting..."
                  : "Submit report"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={!!profilePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setProfilePreview(null)}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center px-6"
          onPress={() => {
            setProfilePreview(null);
            setProfileActionOpen(false);
            setProfileReportOpen(false);
          }}
        >
          <Pressable className="w-full max-w-[380px] rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 relative">
            <View className="absolute right-4 top-3 z-20 flex-row justify-end">
              <Pressable
                className="rounded-full border border-zinc-700 bg-zinc-800/80 p-1.5"
                onPress={() => setProfileActionOpen((prev) => !prev)}
                hitSlop={8}
              >
                <Ionicons name="ellipsis-horizontal" size={15} color="#D4D4D8" />
              </Pressable>
            </View>
            {profileActionOpen ? (
              <View className="absolute right-4 top-11 z-20 w-[180px] rounded-xl border border-zinc-700 bg-zinc-800/95 overflow-hidden">
                <Pressable className="px-3 py-2.5 active:bg-zinc-700/60" onPress={handleCopyProfileUsername}>
                  <Text className="text-zinc-100 text-sm">Copy username</Text>
                </Pressable>
                <View className="h-px bg-zinc-700" />
                <Pressable
                  className={`px-3 py-2.5 active:bg-zinc-700/60 ${
                    reportUser.isPending ? "opacity-60" : ""
                  }`}
                  onPress={() => {
                    handleReportProfile();
                  }}
                  disabled={reportUser.isPending}
                >
                  <Text className="text-orange-300 text-sm">Report user</Text>
                </Pressable>
                <View className="h-px bg-zinc-700" />
                <Pressable
                  className={`px-3 py-2.5 active:bg-zinc-700/60 ${
                    blockUser.isPending ? "opacity-60" : ""
                  }`}
                  onPress={() => {
                    void handleBlockProfile();
                  }}
                  disabled={blockUser.isPending}
                >
                  <Text className="text-red-400 text-sm">
                    {blockUser.isPending ? "Blocking..." : "Block user"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View className="flex-row items-center">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-zinc-700">
                {profilePreview?.imageUrl ? (
                  <Image
                    source={{ uri: profilePreview.imageUrl }}
                    style={{ width: 80, height: 80 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-zinc-100 text-2xl font-semibold">
                    {getAvatarFallback(profilePreview?.name)}
                  </Text>
                )}
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-zinc-100 text-[22px] font-semibold">
                  {profilePreview?.name || "Member"}
                </Text>
                {!!profilePreview?.username ? (
                  <Text className="mt-0.5 text-zinc-400 text-sm">@{profilePreview.username}</Text>
                ) : (
                  <Text className="mt-0.5 text-zinc-500 text-sm">No username</Text>
                )}
              </View>
            </View>
            <View className="mt-4 rounded-3xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3">
              <Text className="text-zinc-400 text-xs mb-1">Account info</Text>
              {!!profilePreview?.id ? (
                <Text className="text-zinc-100 text-sm" numberOfLines={1}>
                  ID: {profilePreview.id}
                </Text>
              ) : (
                <Text className="text-zinc-500 text-sm">No profile id</Text>
              )}
            </View>
            <View className="mt-4 flex-row items-center gap-2">
              <Pressable
                className={`flex-1 rounded-full py-2.5 ${
                  addFriendByName.isPending ? "bg-indigo-500/40" : "bg-indigo-500"
                }`}
                onPress={handleAddFriendFromProfile}
                disabled={addFriendByName.isPending}
              >
                <Text className="text-white text-center text-sm font-semibold">
                  {addFriendByName.isPending ? "Adding..." : "Add Friend"}
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-full border border-zinc-700 py-2.5 ${
                  getOrCreateConversation.isPending ? "opacity-60" : ""
                }`}
                onPress={handleChatFromProfile}
                disabled={getOrCreateConversation.isPending}
              >
                <Text className="text-zinc-100 text-center text-sm font-semibold">
                  {getOrCreateConversation.isPending ? "Opening..." : "Chat"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={profileReportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileReportOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-end"
          onPress={() => setProfileReportOpen(false)}
        >
          <Pressable
            className="w-full rounded-t-2xl bg-[#15161A] border-t border-zinc-800 px-4 pt-4 pb-5"
            onPress={() => {}}
          >
            <Text className="text-zinc-100 text-base font-semibold mb-1">Report user</Text>
            <Text className="text-zinc-400 text-xs mb-3">
              Select a reason. This helps moderators review faster.
            </Text>
            {(Object.keys(reportReasonText) as ReportCategory[]).map((category) => {
              const selected = profileReportCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => setProfileReportCategory(category)}
                  className={`py-3 px-2 rounded-lg mb-1 border ${
                    selected ? "border-orange-300 bg-orange-300/10" : "border-transparent"
                  }`}
                >
                  <Text className={`text-sm ${selected ? "text-orange-200" : "text-zinc-100"}`}>
                    {reportReasonText[category]}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                void submitProfileReport();
              }}
              disabled={reportUser.isPending}
              className={`mt-3 rounded-lg py-3 ${
                reportUser.isPending ? "bg-zinc-700" : "bg-orange-500"
              }`}
            >
              <Text className="text-white text-sm text-center font-semibold">
                {reportUser.isPending ? "Submitting..." : "Submit report"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-end"
          onPress={() => {
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
          }}
        >
          <Pressable className="w-full rounded-t-2xl bg-[#15161A] border-t border-zinc-800 px-4 pt-4 pb-5">
            <Text className="text-zinc-100 text-base font-semibold">Delete message?</Text>
            <Text className="text-zinc-400 text-xs mt-1">
              This message will be removed for everyone and cannot be undone.
            </Text>
            {!!deleteTarget?.text ? (
              <View className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                <Text className="text-zinc-300 text-xs" numberOfLines={2}>
                  {deleteTarget.text}
                </Text>
              </View>
            ) : null}
            <View className="mt-4 flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 rounded-lg border border-zinc-700 py-3"
              >
                <Text className="text-zinc-200 text-sm text-center font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                disabled={deleteChannelMessage.isPending || deleteDirectMessage.isPending}
                className={`flex-1 rounded-lg py-3 ${
                  deleteChannelMessage.isPending || deleteDirectMessage.isPending
                    ? "bg-red-500/40"
                    : "bg-red-500"
                }`}
              >
                <Text className="text-white text-sm text-center font-semibold">
                  {deleteChannelMessage.isPending || deleteDirectMessage.isPending
                    ? "Deleting..."
                    : "Delete"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
