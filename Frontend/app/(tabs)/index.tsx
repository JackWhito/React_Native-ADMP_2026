import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import NavigationSideBar from "../navigation/NavigationSideBar";
import ChatItem from "@/components/ChatItem";
import { useChat } from "@/hooks/useChat";
import { useServers } from "@/hooks/useServer";
import { useMyProfile } from "@/hooks/useProfile";
import type { Chat, DirectMessage, Server } from "@/types";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import ServerDetailPanel from "@/components/ServerDetailPanel";
import ChatDetailModal from "@/components/ChatDetailModal";
import type { ChatDetailTarget } from "@/components/ChatDetailContent";
import { useAuth } from "@clerk/expo";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

type DirectMessageDeletedPayload = {
  messageId?: string;
  _id?: string;
  conversationId?: string;
};

const ChatTab = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { data: conversations, isLoading, error } = useChat();
  const { data: servers } = useServers();
  const { data: myProfile } = useMyProfile();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [lastOpenedChat, setLastOpenedChat] = useState<ChatDetailTarget | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [onlineProfileIds, setOnlineProfileIds] = useState<string[]>([]);
  const getTokenRef = React.useRef(getToken);
  const onlineProfileIdSet = useMemo(() => new Set(onlineProfileIds.map(String)), [onlineProfileIds]);

  const socketUrl = useMemo(() => {
    const rawBaseUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.EXPO_PUBLIC_BACKEND_URL ||
      "http://192.168.1.11:5000/api";
    return rawBaseUrl.replace(/\/api\/?$/, "");
  }, []);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!selectedServer?._id) return;
    const stillExists = (servers ?? []).some((s) => String(s._id) === String(selectedServer._id));
    if (!stillExists) {
      setSelectedServer(null);
    }
  }, [selectedServer, servers]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setOnlineProfileIds((current) => (current.length === 0 ? current : []));
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;

    const connectSocket = async () => {
      const token = await getTokenRef.current();
      if (!token || cancelled) return;

      socket = io(socketUrl, {
        transports: ["websocket"],
        auth: { token },
      });

      socket.on("online-users", (payload: { usersId?: string[] }) => {
        const ids = Array.isArray(payload?.usersId) ? payload.usersId.map(String) : [];
        setOnlineProfileIds((current) => {
          if (current.length === ids.length && current.every((value, index) => value === ids[index])) {
            return current;
          }
          return ids;
        });
      });

      socket.on("user-online", (payload: { userId?: string }) => {
        const id = String(payload?.userId ?? "");
        if (!id) return;
        setOnlineProfileIds((current) => (current.includes(id) ? current : [...current, id]));
      });

      socket.on("user-offline", (payload: { userId?: string }) => {
        const id = String(payload?.userId ?? "");
        if (!id) return;
        setOnlineProfileIds((current) => {
          if (!current.includes(id)) return current;
          return current.filter((value) => value !== id);
        });
      });

      socket.on("new-message", (incoming: DirectMessage) => {
        const conversationId = String(incoming?.conversation ?? "");
        if (!conversationId) return;
        queryClient.setQueryData<Chat[]>(["conversations"], (current) => {
          if (!Array.isArray(current) || current.length === 0) return current;
          const target = current.find((item) => String(item._id) === conversationId);
          if (!target) return current;
          const updated: Chat = {
            ...target,
            lastMessage: {
              _id: incoming._id,
              content: incoming.content,
              fileUrl: incoming.fileUrl,
              sender: typeof incoming.member === "string" ? incoming.member : String(incoming.member?._id ?? ""),
              createdAt: incoming.createdAt,
            },
            lastMessageAt: incoming.createdAt,
          };
          return [updated, ...current.filter((item) => String(item._id) !== conversationId)];
        });
      });
      socket.on("direct-message-updated", (incoming: DirectMessage) => {
        const conversationId = String(incoming?.conversation ?? "");
        if (!conversationId) return;
        queryClient.setQueryData<Chat[]>(["conversations"], (current) => {
          if (!Array.isArray(current) || current.length === 0) return current;
          const target = current.find((item) => String(item._id) === conversationId);
          if (!target) return current;
          const currentLastMessageId = String(target.lastMessage?._id ?? "");
          if (currentLastMessageId !== String(incoming._id)) return current;
          const updated: Chat = {
            ...target,
            lastMessage: {
              _id: incoming._id,
              content: incoming.content,
              fileUrl: incoming.fileUrl,
              sender: typeof incoming.member === "string" ? incoming.member : String(incoming.member?._id ?? ""),
              createdAt: incoming.createdAt,
            },
            lastMessageAt: incoming.createdAt,
          };
          return [updated, ...current.filter((item) => String(item._id) !== conversationId)];
        });
      });
      socket.on("direct-message-deleted", (incoming: DirectMessageDeletedPayload) => {
        const messageId = String(incoming?.messageId ?? incoming?._id ?? "");
        const conversationId = String(incoming?.conversationId ?? "");
        if (!messageId || !conversationId) return;
        queryClient.setQueryData<Chat[]>(["conversations"], (current) => {
          if (!Array.isArray(current) || current.length === 0) return current;
          const target = current.find((item) => String(item._id) === conversationId);
          if (!target) return current;
          const currentLastMessageId = String(target.lastMessage?._id ?? "");
          if (currentLastMessageId !== messageId) return current;
          const updated: Chat = {
            ...target,
            lastMessage: {
              _id: messageId,
              content: "Message deleted",
              fileUrl: "",
              sender: typeof target.lastMessage?.sender === "string"
                ? target.lastMessage.sender
                : String(target.lastMessage?.sender?._id ?? ""),
              createdAt: target.lastMessageAt,
            },
          };
          return [updated, ...current.filter((item) => String(item._id) !== conversationId)];
        });
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [isLoaded, isSignedIn, queryClient, socketUrl]);

  const openChatModal = useCallback((t: ChatDetailTarget) => {
    setLastOpenedChat(t);
    setChatModalOpen(true);
  }, []);

  const closeChatModal = useCallback(() => {
    setChatModalOpen(false);
  }, []);

  const handleChatPress = useCallback((item: Chat) => {
    setActiveChatId(item._id);
    setSelectedServer(null);
    openChatModal({
      kind: "dm",
      id: item._id,
      name: item.member.name,
      imageUrl: item.member.imageUrl,
      userId: item.member._id,
      username: item.member.username,
    });
  }, [openChatModal]);

  const renderConversationItem = useCallback(
    ({ item }: { item: Chat }) => (
      <ChatItem
        chat={item}
        onPress={() => handleChatPress(item)}
        isOnline={onlineProfileIdSet.has(String(item.member?._id ?? ""))}
        myProfileId={myProfile?._id}
      />
    ),
    [handleChatPress, myProfile?._id, onlineProfileIdSet]
  );

  const swipeTarget = useMemo(() => {
    if (!conversations || conversations.length === 0) return null;
    return conversations.find((c) => c._id === activeChatId) ?? conversations[0];
  }, [activeChatId, conversations]);

  const openChatFromSwipe = useCallback(() => {
    if (lastOpenedChat) {
      setChatModalOpen(true);
      return;
    }
    if (!selectedServer && swipeTarget) {
      openChatModal({
        kind: "dm",
        id: swipeTarget._id,
        name: swipeTarget.member.name,
        imageUrl: swipeTarget.member.imageUrl,
        userId: swipeTarget.member._id,
        username: swipeTarget.member.username,
      });
    }
  }, [lastOpenedChat, selectedServer, swipeTarget, openChatModal]);

  const swipeToOpen = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-24)
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          "worklet";
          if (e.translationX < -60 && Math.abs(e.translationY) < 40) {
            runOnJS(openChatFromSwipe)();
          }
        }),
    [openChatFromSwipe]
  );

  return (
    <>
      <GestureDetector gesture={swipeToOpen}>
        <View className="flex-1 flex-row bg-zinc-900">
          <View className="w-[72px]">
            <NavigationSideBar
              onSelectServer={(server) => setSelectedServer(server)}
              onGoHome={() => setSelectedServer(null)}
            />
          </View>

          <View className="flex-col flex-1">
            {selectedServer ? (
              <ServerDetailPanel
                server={selectedServer}
                onBackToChats={() => setSelectedServer(null)}
                onOpenTextChannel={(channel) => {
                  openChatModal({
                    kind: "channel",
                    id: channel._id,
                    channelName: channel.name,
                    serverId: selectedServer._id,
                    serverName: selectedServer.name,
                  });
                }}
              />
            ) : (
              <>
                <View className="px-[16px] py-[12px] border-zinc-800">
                  <Text className="text-white text-[18px] font-semibold">Chat Messages</Text>
                </View>

                <View className="h-[48px] px-[16px] flex-row items-center border-zinc-800">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="w-[38px] h-[38px] rounded-[24px] bg-sidebar justify-center items-center"
                  >
                    <Ionicons name="search" size={18} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="ml-[8px] flex-row items-center justify-center bg-sidebar rounded-[24px] w-[240px] h-[38px]"
                    onPress={() => router.push("/friends/add")}
                  >
                    <Ionicons name="person-add" size={18} color="white" />
                    <Text className="text-white ml-[12px]">Add Friends</Text>
                  </TouchableOpacity>
                </View>

                {isLoading ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                  </View>
                ) : error ? (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-red-500">Failed to load</Text>
                  </View>
                ) : (
                  <FlatList
                    data={conversations}
                    keyExtractor={(item) => item._id}
                    renderItem={renderConversationItem}
                    initialNumToRender={14}
                    maxToRenderPerBatch={8}
                    updateCellsBatchingPeriod={60}
                    windowSize={7}
                    removeClippedSubviews
                    showsVerticalScrollIndicator={false}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{
                      paddingHorizontal: 10,
                      paddingTop: 10,
                      paddingBottom: 10,
                    }}
                    ListEmptyComponent={<Text className="text-white">No Chat found</Text>}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </GestureDetector>

      <ChatDetailModal
        visible={chatModalOpen}
        target={lastOpenedChat}
        onClose={closeChatModal}
      />
    </>
  );
};

export default ChatTab;
