import { View, Text, ActivityIndicator, FlatList } from "react-native";
import { router } from "expo-router";
import { useServers } from "@/hooks/useServer";
import ServerItem from "@/components/ServerItem";
import NavigationAction from "@/components/NavigationAction";
import { Server } from "@/types";
import React, { useMemo, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export default function NavigationSideBar({ onSelectServer }: { onSelectServer?: (server: Server) => void }) {
    const {data:servers, isLoading, error} = useServers()
    const [activeServerId, setActiveServerId] = useState<string | null>(null);

    const handleServerPress = (server: Server) => {
        setActiveServerId(server._id);
        if (onSelectServer) {
          onSelectServer(server);
          return;
        }
        router.push({
          pathname:"/server/[id]",
          params:{
              id:server._id,
              name: server.name,
              imageUrl: server.imageUrl,
          }
        })
    };

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
      [swipeTarget]
    );
    return (
        <GestureDetector gesture={swipeToOpen}>
        <View className="flex-1 dark:bg-[#1E1F22] space-y-4 flex-col items-center py-3 w-full">           
            <NavigationAction />
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#F4A261" />
              </View>
            ) : error ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-red-500">Failed to load</Text>
              </View>
            ) : (
              <FlatList
                  data = {servers}
                  keyExtractor={(item) => item._id}
                  renderItem={({item}) => <ServerItem server={item} onPress={() => handleServerPress(item)} />}
                  showsVerticalScrollIndicator={false}
                  contentInsetAdjustmentBehavior="automatic"
                  contentContainerStyle={{paddingHorizontal:10, paddingTop:10, paddingBottom:10, alignItems: "center"}}
                  ListEmptyComponent={<Text className="text-white">No Server found</Text>}
              />
            )}
        </View>     
        </GestureDetector>
    )
}
