import { View, Text, Pressable, FlatList, ActivityIndicator, Image } from "react-native";
import React, { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  useAcceptFriendInvite,
  useAcceptServerInvite,
  useMarkNotificationAsRead,
  useNotifications,
  useRejectFriendInvite,
  useRejectServerInvite,
} from "@/hooks/useNotification";
import { remoteImageSource } from "@/lib/utils";

export default function NotificationsTab() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const acceptInvite = useAcceptServerInvite();
  const rejectInvite = useRejectServerInvite();
  const acceptFriendInvite = useAcceptFriendInvite();
  const rejectFriendInvite = useRejectFriendInvite();
  const markAsRead = useMarkNotificationAsRead();
  const notifications = useMemo(() => data ?? [], [data]);

  const formatTimeAgo = useCallback((iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  }, []);

  const getNotificationTimeLabel = useCallback((notification: {
    createdAt?: string;
    updatedAt?: string;
    readAt?: string | null;
  }) => {
    return formatTimeAgo(notification.updatedAt || notification.createdAt || notification.readAt || undefined);
  }, [formatTimeAgo]);

  const openServerMessageNotification = useCallback(async (notificationId: string, input: {
    serverId?: string;
    serverName?: string;
    channelId?: string;
    channelName?: string;
  }) => {
    // Mark read for every open path (early returns below used to skip this entirely).
    markAsRead.mutate(String(notificationId));

    if (input.channelId && input.serverId) {
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: input.channelId,
          name: `#${input.channelName || "general"}`,
          scope: "channel",
          serverId: input.serverId,
          serverName: input.serverName || "Server",
        },
      });
      return;
    }

    if (input.serverId) {
      router.push({
        pathname: "/server/[id]",
        params: {
          id: input.serverId,
          name: input.serverName || "Server",
        },
      });
    }
  }, [markAsRead, router]);

  const renderNotificationItem = useCallback(({ item: n }: { item: any }) => (
    <View
      className={`rounded-xl border p-3 mb-2 ${
        n.isRead ? "border-zinc-800 bg-zinc-900/70" : "border-indigo-500/40 bg-zinc-900"
      }`}
    >
      {n.type === "server_message" ? (
        <Pressable
          className="flex-row items-center"
          onPress={() =>
            openServerMessageNotification(n._id, {
              serverId: n.server?._id,
              serverName: n.server?.name,
              channelId: n.channel?._id,
              channelName: n.channel?.name,
            })
          }
        >
          <View className="h-10 w-10 rounded-full overflow-hidden bg-zinc-700 items-center justify-center mr-3">
            {remoteImageSource(n.server?.imageUrl) ? (
              <Image
                source={remoteImageSource(n.server?.imageUrl)}
                style={{ width: 40, height: 40 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-zinc-100 text-xs font-semibold">
                {(n.server?.name ?? "S").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold">
              {n.server?.name ?? "Server"}
            </Text>
            {!!n.message ? (
              <Text className="text-zinc-300 text-xs mt-0.5" numberOfLines={2}>
                {n.message}
              </Text>
            ) : null}
            <Text className="text-zinc-400 text-xs mt-1">
              {getNotificationTimeLabel(n)}
            </Text>
          </View>
          {!n.isRead ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-indigo-400" /> : null}
        </Pressable>
      ) : n.type === "mention_message" ? (
        <Pressable
          className="flex-row items-start"
          onPress={() =>
            openServerMessageNotification(n._id, {
              serverId: n.server?._id,
              serverName: n.server?.name,
              channelId: n.channel?._id,
              channelName: n.channel?.name,
            })
          }
        >
          <View className="h-10 w-10 rounded-full overflow-hidden bg-zinc-700 items-center justify-center mr-3 mt-0.5">
            {remoteImageSource(n.sender?.imageUrl) ? (
              <Image
                source={remoteImageSource(n.sender?.imageUrl)}
                style={{ width: 40, height: 40 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-zinc-100 text-xs font-semibold">
                {(n.sender?.name ?? "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold">
              {(n.sender?.name ?? "Someone")} has mentioned you in {(n.server?.name ?? "Server")}:
            </Text>
            {!!n.message ? (
              <Text className="text-zinc-300 text-xs mt-0.5" numberOfLines={2}>
                {n.message}
              </Text>
            ) : null}
            <Text className="text-zinc-400 text-xs mt-1">
              {getNotificationTimeLabel(n)}
            </Text>
          </View>
          {!n.isRead ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-indigo-400 mt-1.5" /> : null}
        </Pressable>
      ) : n.type === "friend_invite" ? (
        <>
          <Text className="text-white text-sm font-semibold">
            {n.sender?.name ?? "Someone"} sent you a friend invite
          </Text>
          <Text className="text-zinc-400 text-xs mt-1">
            @{n.sender?.username ?? "unknown"} · {n.status}
          </Text>
          <Text className="text-zinc-500 text-xs mt-1">
            {getNotificationTimeLabel(n)}
          </Text>
        </>
      ) : (
        <>
          <Text className="text-white text-sm font-semibold">
            {n.sender?.name ?? "Someone"} invited you to {n.server?.name ?? "a server"}
          </Text>
          <Text className="text-zinc-400 text-xs mt-1">
            @{n.sender?.username ?? "unknown"} · {n.status}
          </Text>
          <Text className="text-zinc-500 text-xs mt-1">
            {getNotificationTimeLabel(n)}
          </Text>
        </>
      )}
      {n.type === "server_invite" && n.status === "pending" ? (
        <View className="flex-row gap-2 mt-3">
          <Pressable
            className="flex-1 bg-indigo-500 rounded-md px-3 py-2.5"
            disabled={acceptInvite.isPending}
            onPress={() => acceptInvite.mutate(n._id)}
          >
            <Text className="text-white text-center font-semibold text-xs">
              {acceptInvite.isPending ? "Accepting..." : "Accept"}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 bg-zinc-700 rounded-md px-3 py-2.5"
            disabled={rejectInvite.isPending}
            onPress={() => rejectInvite.mutate(n._id)}
          >
            <Text className="text-white text-center font-semibold text-xs">
              {rejectInvite.isPending ? "Rejecting..." : "Reject"}
            </Text>
          </Pressable>
        </View>
      ) : n.type === "friend_invite" && n.status === "pending" ? (
        <View className="flex-row gap-2 mt-3">
          <Pressable
            className="flex-1 bg-indigo-500 rounded-md px-3 py-2.5"
            disabled={acceptFriendInvite.isPending}
            onPress={() => acceptFriendInvite.mutate(n._id)}
          >
            <Text className="text-white text-center font-semibold text-xs">
              {acceptFriendInvite.isPending ? "Accepting..." : "Accept"}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 bg-zinc-700 rounded-md px-3 py-2.5"
            disabled={rejectFriendInvite.isPending}
            onPress={() => rejectFriendInvite.mutate(n._id)}
          >
            <Text className="text-white text-center font-semibold text-xs">
              {rejectFriendInvite.isPending ? "Rejecting..." : "Reject"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  ), [
    acceptFriendInvite,
    acceptInvite,
    getNotificationTimeLabel,
    openServerMessageNotification,
    rejectFriendInvite,
    rejectInvite,
  ]);

  return (
    <View className="flex-1 bg-background px-4 pt-4">
      <Text className="text-foreground text-lg font-semibold mb-3">Notifications</Text>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !notifications.length ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground text-sm text-center">
            No notifications yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotificationItem}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={60}
          windowSize={7}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}
