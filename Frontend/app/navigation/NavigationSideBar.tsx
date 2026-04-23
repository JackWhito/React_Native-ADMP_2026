import { View, Text, ActivityIndicator, FlatList, RefreshControl, Pressable } from "react-native";
import { router } from "expo-router";
import { useServers } from "@/hooks/useServer";
import ServerItem from "@/components/ServerItem";
import NavigationAction from "@/components/NavigationAction";
import CreateServerModal from "@/components/CreateServerModal";
import { Server } from "@/types";
import React, { useCallback, useMemo, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

export default function NavigationSideBar({
  onSelectServer,
  onGoHome,
}: {
  onSelectServer?: (server: Server) => void;
  onGoHome?: () => void;
}) {
  const { data: servers, isLoading, error, refetch, isRefetching } = useServers();
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleGoHome = useCallback(() => {
    setActiveServerId(null);
    onGoHome?.();
  }, [onGoHome]);

  const handleServerPress = useCallback(
    (server: Server) => {
      setActiveServerId(server._id);
      if (onSelectServer) {
        onSelectServer(server);
        return;
      }
      router.push({
        pathname: "/server/[id]",
        params: {
          id: server._id,
          name: server.name,
          imageUrl: server.imageUrl,
        },
      });
    },
    [onSelectServer]
  );

  const swipeTarget = useMemo(() => {
    if (!servers || servers.length === 0) return null;
    return servers.find((s: Server) => s._id === activeServerId) ?? servers[0];
  }, [activeServerId, servers]);

  const swipeToOpen = useMemo(
    () =>
      Gesture.Pan().onEnd((e) => {
        if (e.translationX < -45 && Math.abs(e.translationY) < 40 && swipeTarget) {
          handleServerPress(swipeTarget);
        }
      }),
    [swipeTarget, handleServerPress]
  );

  const listHeader = useMemo(
    () => (
      <View className="pt-2 pb-2 items-center w-full">
        <Pressable
          onPress={handleGoHome}
          className="h-[48px] w-[48px] rounded-[24px] bg-zinc-700 items-center justify-center active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Home, direct messages"
        >
          <Ionicons name="home" size={24} color="#F2F3F5" />
        </Pressable>
      </View>
    ),
    [handleGoHome]
  );

  const listFooter = useMemo(
    () => (
      <View className="pt-4 pb-3 mt-2 border-t border-[#1E1F22] items-center w-full">
        <NavigationAction onPress={() => setCreateModalOpen(true)} />
      </View>
    ),
    []
  );

  const listEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="py-10 items-center">
          <ActivityIndicator size="large" color="#F4A261" />
        </View>
      );
    }
    if (error) {
      return (
        <View className="py-8 px-2 items-center">
          <Text className="text-red-500 text-center text-xs">Failed to load</Text>
        </View>
      );
    }
    return (
      <Text className="text-white text-xs py-6 text-center opacity-80">No servers</Text>
    );
  }, [isLoading, error]);

  return (
    <>
    <GestureDetector gesture={swipeToOpen}>
      <View className="flex-1 dark:bg-[#1E1F22] w-full">
        <FlatList
          style={{ flex: 1 }}
          data={servers ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ServerItem server={item} onPress={() => handleServerPress(item)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingBottom: 8,
            alignItems: "center",
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor="#F4A261"
              colors={["#F4A261"]}
            />
          }
        />
      </View>
    </GestureDetector>
    <CreateServerModal
      visible={createModalOpen}
      onClose={() => setCreateModalOpen(false)}
    />
    </>
  );
}
