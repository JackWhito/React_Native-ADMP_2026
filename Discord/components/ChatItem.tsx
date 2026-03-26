import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native'
import React from 'react'
import { Chat } from '@/types'
import { remoteImageSource } from '@/lib/utils'
import { useRouter } from 'expo-router'
import { useChat } from '@/hooks/useChat'
import { formatDistanceToNow } from 'date-fns'
const ChatItem = ({chat, onPress}: {chat: Chat, onPress: () => void}) => {
  const participant = chat.member
  const isOnline = false
  const hasUnread = false
  const isTyping = false

  const timeLabel =
    chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleDateString() : ""

  return (
    <Pressable className="flex-row items-center py-3 active:opacity-70" onPress={onPress}>
      {/* avatar & online indicator */}
      <View className="relative">
        <Image
          source={remoteImageSource(participant?.imageUrl)}
          style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: "#27272a" }}
        />
        {isOnline && (
          <View className="absolute bottom-0 right-0 size-4 bg-green-500 rounded-full border-[3px] border-surface" />
        )}
      </View>

      {/* chat info */}
      <View className="flex-1 ml-4">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base font-medium ${hasUnread ? "text-primary" : "text-foreground"}`}
          >
            {participant?.name ?? "Unknown"} 
          </Text>
          <View className="flex-row items-center gap-2">
            {hasUnread && <View className="w-2.5 h-2.5 bg-primary rounded-full" />}
            <Text className="text-xs text-subtle-foreground">
              {chat.lastMessageAt 
               ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false })
               : ""}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-1">
          {isTyping ? (
            <Text className="text-sm text-primary italic">typing...</Text>
          ) : (
            <Text
              className={`text-sm flex-1 mr-3 ${hasUnread ? "text-foreground font-medium" : "text-subtle-foreground"}`}
              numberOfLines={1}
            >
              {chat.lastMessage?.text || "No messages yet"}
            </Text>
          )}

        </View>
      </View>
    </Pressable>
  )
}

export default ChatItem