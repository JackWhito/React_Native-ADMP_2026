import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import NavigationSideBar from "../navigation/NavigationSideBar";
import ChatItem from "@/components/ChatItem";
import { useChat } from "@/hooks/useChat";
import type { Chat, Server } from "@/types";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import ServerDetailPanel from "@/components/ServerDetailPanel";
import ChatDetailModal from "@/components/ChatDetailModal";
import type { ChatDetailTarget } from "@/components/ChatDetailContent";

const ChatTab = () => {
  const { data: conversations, isLoading, error } = useChat();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [lastOpenedChat, setLastOpenedChat] = useState<ChatDetailTarget | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const openChatModal = useCallback((t: ChatDetailTarget) => {
    setLastOpenedChat(t);
    setChatModalOpen(true);
  }, []);

  const closeChatModal = useCallback(() => {
    setChatModalOpen(false);
  }, []);

  const handleChatPress = (item: Chat) => {
    setActiveChatId(item._id);
    setSelectedServer(null);
    openChatModal({
      kind: "dm",
      id: item._id,
      name: item.member.name,
      imageUrl: item.member.imageUrl,
    });
  };

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
                    renderItem={({ item }) => (
                      <ChatItem chat={item} onPress={() => handleChatPress(item)} />
                    )}
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
