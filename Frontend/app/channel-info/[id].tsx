import React, { useEffect, useMemo, useState } from "react";
import { Pressable, FlatList, Text, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAppAuthed } from "@/hooks/useAppAuthed";
import { useApi } from "@/lib/axios";
import { useServerMembers } from "@/hooks/useServer";
import type { ChannelMessage } from "@/types";

type ChannelInfoTab = "members" | "media" | "pinned";
type ChannelInfoListItem =
  | { key: string; type: "member"; member: { _id: string; name: string; username?: string; imageUrl?: string; role: "admin" | "guest" } }
  | { key: string; type: "media"; message: ChannelMessage }
  | { key: string; type: "pinned"; message: ChannelMessage };

export default function ChannelInfoScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { apiWithAuth } = useApi();
  const { isAuthLoaded, isAuthed } = useAppAuthed();
  const params = useLocalSearchParams<{
    id?: string | string[];
    channelName?: string | string[];
    serverId?: string | string[];
    serverName?: string | string[];
  }>();

  const channelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const channelNameRaw = Array.isArray(params.channelName) ? params.channelName[0] : params.channelName;
  const channelName = (channelNameRaw || "channel").replace(/^#/, "");
  const serverId = Array.isArray(params.serverId) ? params.serverId[0] : params.serverId;
  const serverName = (Array.isArray(params.serverName) ? params.serverName[0] : params.serverName) || "Server";

  const [activeTab, setActiveTab] = useState<ChannelInfoTab>("members");
  const [mediaAutoPrefetchCount, setMediaAutoPrefetchCount] = useState(0);

  const { data: membersData } = useServerMembers(serverId || null);
  const members = useMemo(() => membersData?.members ?? [], [membersData?.members]);
  const pageSize = 30;
  const messagesQuery = useInfiniteQuery({
    queryKey: ["channel-info-messages", channelId],
    queryFn: async ({ pageParam }) => {
      const cursor = typeof pageParam === "string" ? pageParam : undefined;
      const { data } = await apiWithAuth<
        ChannelMessage[] | { messages?: ChannelMessage[]; nextCursor?: string | null; hasMore?: boolean }
      >({
        method: "GET",
        url: `/messages/channel/${channelId}`,
        params: {
          limit: pageSize,
          ...(cursor ? { cursor } : {}),
        },
      });
      if (Array.isArray(data)) {
        const lastCreatedAt = data[data.length - 1]?.createdAt;
        return {
          messages: data,
          nextCursor: data.length === pageSize ? (lastCreatedAt ?? null) : null,
          hasMore: data.length === pageSize,
        };
      }
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      return {
        messages,
        nextCursor: typeof data?.nextCursor === "string" ? data.nextCursor : null,
        hasMore: typeof data?.hasMore === "boolean" ? data.hasMore : messages.length === pageSize,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined),
    enabled: Boolean(channelId && isAuthLoaded && isAuthed),
    refetchOnWindowFocus: false,
    staleTime: 45_000,
  });

  const messages = useMemo(() => {
    const deduped = new Map<string, ChannelMessage>();
    for (const page of messagesQuery.data?.pages ?? []) {
      for (const msg of page.messages) deduped.set(msg._id, msg);
    }
    return [...deduped.values()];
  }, [messagesQuery.data?.pages]);

  const hasOlderMessages = messagesQuery.hasNextPage;
  const isLoadingOlderMessages = messagesQuery.isFetchingNextPage;
  const loadOlderMessages = messagesQuery.fetchNextPage;

  const mediaMessages = useMemo(
    () => (messages ?? []).filter((msg) => !msg.deleted && !!String(msg.fileUrl ?? "").trim()),
    [messages]
  );

  useEffect(() => {
    if (!isFocused) return;
    if (activeTab !== "media") return;
    if (!hasOlderMessages || isLoadingOlderMessages) return;
    if (mediaAutoPrefetchCount >= 2) return;
    setMediaAutoPrefetchCount((current) => current + 1);
    void loadOlderMessages();
  }, [
    activeTab,
    hasOlderMessages,
    isFocused,
    isLoadingOlderMessages,
    loadOlderMessages,
    mediaAutoPrefetchCount,
  ]);

  useEffect(() => {
    if (activeTab !== "media") {
      setMediaAutoPrefetchCount(0);
    }
  }, [activeTab]);

  const handleGoBack = () => {
    // Stop the media-loading loop workload before transition.
    setActiveTab("members");
    requestAnimationFrame(() => {
      router.back();
    });
  };

  const pinnedMessages = useMemo(() => {
    // Placeholder pin detection until dedicated pin field/endpoint exists.
    return (messages ?? []).filter((msg) => !msg.deleted && /^📌/u.test(String(msg.content ?? "").trim()));
  }, [messages]);

  const listData = useMemo<ChannelInfoListItem[]>(() => {
    if (activeTab === "members") {
      return members.map((member) => ({ key: member._id, type: "member", member }));
    }
    if (activeTab === "media") {
      return mediaMessages.map((message) => ({ key: message._id, type: "media", message }));
    }
    return pinnedMessages.map((message) => ({ key: message._id, type: "pinned", message }));
  }, [activeTab, members, mediaMessages, pinnedMessages]);

  const emptyText = useMemo(() => {
    if (activeTab === "members") return "No members found.";
    if (activeTab === "media") return "No media shared in this channel yet.";
    return "No pinned messages yet.";
  }, [activeTab]);

  const sectionCountText = useMemo(() => {
    if (activeTab === "members") return `${members.length} members`;
    if (activeTab === "media") return `${mediaMessages.length} media items`;
    return `${pinnedMessages.length} pinned messages`;
  }, [activeTab, members.length, mediaMessages.length, pinnedMessages.length]);

  if (!channelId || !serverId) {
    return null;
  }

  const renderListItem = ({ item }: { item: ChannelInfoListItem }) => {
    if (item.type === "member") {
      const { member } = item;
      return (
        <View className="mb-2 flex-row items-center rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5">
          <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-zinc-700">
            {member.imageUrl ? (
              <Image source={{ uri: member.imageUrl }} style={{ width: 36, height: 36 }} resizeMode="cover" />
            ) : (
              <Text className="text-zinc-100 text-xs font-semibold">
                {(member.name || "M").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View className="ml-2.5 flex-1">
            <Text className="text-zinc-100 text-sm" numberOfLines={1}>
              {member.name || "Member"}
            </Text>
            {!!member.username ? (
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                @{member.username}
              </Text>
            ) : null}
          </View>
          <Text className="text-zinc-400 text-[11px] uppercase">{member.role}</Text>
        </View>
      );
    }
    if (item.type === "media") {
      const msg = item.message;
      return (
        <View className="mb-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
          <Image source={{ uri: msg.fileUrl }} style={{ width: "100%", height: 190 }} resizeMode="cover" />
          <View className="px-3 py-2">
            <Text className="text-zinc-400 text-xs">
              {new Date(msg.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
      );
    }
    const msg = item.message;
    return (
      <View className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5">
        <Text className="text-zinc-100 text-sm">{String(msg.content ?? "").replace(/^📌\s*/u, "")}</Text>
        <Text className="mt-1 text-zinc-500 text-[11px]">{new Date(msg.createdAt).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center border-b border-zinc-800 px-4 py-3">
        <Pressable onPress={handleGoBack} className="mr-3 rounded-full p-1.5 active:opacity-70" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            #{channelName}
          </Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>
            {serverName}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center border-b border-zinc-800 px-3 py-2">
        {(["members", "media", "pinned"] as ChannelInfoTab[]).map((tab) => {
          const selected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`mr-2 rounded-full px-3 py-1.5 ${selected ? "bg-indigo-500/20" : "bg-zinc-800/60"}`}
            >
              <Text className={`text-xs font-medium ${selected ? "text-indigo-200" : "text-zinc-300"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderListItem}
        className="flex-1 px-4 py-2"
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={60}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View className="mt-2 mb-2">
            <Text className="text-zinc-300 text-xs">{sectionCountText}</Text>
          </View>
        }
        ListEmptyComponent={<Text className="mt-2 text-zinc-500 text-sm">{emptyText}</Text>}
        ListFooterComponent={
          activeTab === "media" ? (
            <View className="pb-2">
              {isLoadingOlderMessages ? (
                <Text className="mt-1 text-zinc-500 text-xs">Loading older media...</Text>
              ) : null}
              {hasOlderMessages && !isLoadingOlderMessages ? (
                <Pressable
                  onPress={() => {
                    void loadOlderMessages();
                  }}
                  className="mt-3 self-start rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1.5 active:opacity-80"
                >
                  <Text className="text-zinc-200 text-xs font-medium">Load older media</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
