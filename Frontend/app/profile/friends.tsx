import React, { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, Image, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "@/hooks/useChat";
import { remoteImageSource } from "@/lib/utils";

export default function FriendsListScreen() {
  const router = useRouter();
  const { data: conversations, isLoading, error } = useChat();
  const [searchText, setSearchText] = useState("");

  const friends = useMemo(() => {
    return [...(conversations ?? [])].sort((a, b) =>
      String(a.member?.name ?? "").localeCompare(String(b.member?.name ?? ""), undefined, {
        sensitivity: "base",
      })
    );
  }, [conversations]);

  const filteredFriends = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((item) => {
      const name = String(item.member?.name ?? "").toLowerCase();
      const username = String(item.member?.username ?? "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [friends, searchText]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-900" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <Pressable onPress={() => router.back()} className="mr-3 active:opacity-70">
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text className="text-white text-base font-semibold">Friend list</Text>
      </View>
      <View className="px-4 pt-3 pb-2 border-b border-zinc-800/80">
        <View className="flex-row items-center rounded-xl bg-zinc-800 px-3 py-2.5">
          <Ionicons name="search-outline" size={16} color="#A1A1AA" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search friends"
            placeholderTextColor="#71717A"
            className="ml-2 flex-1 text-zinc-100 text-sm"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.trim() ? (
            <Pressable onPress={() => setSearchText("")} className="ml-2">
              <Ionicons name="close-circle" size={16} color="#A1A1AA" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A1A1AA" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-400 text-sm text-center">Could not load friend list.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const name = item.member?.name ?? "Unknown";
            const avatar = remoteImageSource(item.member?.imageUrl);
            return (
              <View className="flex-row items-center rounded-xl bg-zinc-800/60 px-3 py-2.5">
                <View className="mr-3 h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-zinc-700">
                  {avatar ? (
                    <Image source={avatar} style={{ width: 44, height: 44 }} resizeMode="cover" />
                  ) : (
                    <Text className="text-zinc-100 text-sm font-semibold">
                      {name.charAt(0).toUpperCase() || "?"}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-100 text-sm font-semibold" numberOfLines={1}>
                    {name}
                  </Text>
                  {item.member?.username ? (
                    <Text className="text-zinc-400 text-xs mt-0.5" numberOfLines={1}>
                      @{item.member.username}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-400/40"
                  onPress={() =>
                    router.push({
                      pathname: "/chat/[id]",
                      params: {
                        id: item._id,
                        name,
                        imageUrl: item.member?.imageUrl || "",
                      },
                    })
                  }
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color="#C7D2FE" />
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-14">
              <Ionicons name="people-outline" size={24} color="#71717A" />
              <Text className="text-zinc-400 text-sm mt-2">
                {searchText.trim() ? "No matching friends." : "No friends yet."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
