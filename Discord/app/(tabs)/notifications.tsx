import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import React from "react";
import {
  useAcceptServerInvite,
  useNotifications,
  useRejectServerInvite,
} from "@/hooks/useNotification";

export default function NotificationsTab() {
  const { data, isLoading } = useNotifications();
  const acceptInvite = useAcceptServerInvite();
  const rejectInvite = useRejectServerInvite();

  return (
    <View className="flex-1 bg-background px-4 pt-4">
      <Text className="text-foreground text-lg font-semibold mb-3">Notifications</Text>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !(data?.length ?? 0) ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground text-sm text-center">
            No notifications yet.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {data?.map((n) => (
            <View key={n._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 mb-2">
              <Text className="text-white text-sm font-semibold">
                {n.sender?.name ?? "Someone"} invited you to {n.server?.name ?? "a server"}
              </Text>
              <Text className="text-zinc-400 text-xs mt-1">
                @{n.sender?.username ?? "unknown"} · {n.status}
              </Text>
              {n.status === "pending" ? (
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
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
