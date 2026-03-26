import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useServerChannels } from "@/hooks/useServer";
import type { ServerChannel } from "@/types";

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
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <View className="mt-0.5">
      <Pressable
        onPress={() => setOpen((v) => !v)}
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
  onBack,
  onOpenTextChannel,
}: {
  serverId: string;
  serverName: string;
  onBack: () => void;
  onOpenTextChannel?: (channel: ServerChannel) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: channels, isLoading, error } = useServerChannels(serverId);

  const textChannels = channels?.filter((c) => c.type === "text") ?? [];
  const voiceChannels = channels?.filter((c) => c.type === "audio") ?? [];

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
        <Text
          className="flex-1 text-[#F2F3F5] text-base font-semibold text-center px-2"
          numberOfLines={1}
        >
          {serverName}
        </Text>
        <View style={{ width: 36 }} />
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
          <ChannelSectionDropdown title="TEXT CHANNELS" defaultExpanded>
            {textChannels.map((c) => (
              <ChannelRow key={c._id} channel={c} onTextChannelPress={openTextChannel} />
            ))}
            {!textChannels.length ? (
              <Text className="text-muted-foreground text-sm px-3 py-2 pl-7">No text channels.</Text>
            ) : null}
          </ChannelSectionDropdown>

          <ChannelSectionDropdown title="VOICE CHANNELS" defaultExpanded>
            {voiceChannels.map((c) => (
              <ChannelRow key={c._id} channel={c} onTextChannelPress={openTextChannel} />
            ))}
            {!voiceChannels.length ? (
              <Text className="text-muted-foreground text-sm px-3 py-2 pl-7">No voice channels.</Text>
            ) : null}
          </ChannelSectionDropdown>
        </ScrollView>
      )}
    </View>
  );
}
