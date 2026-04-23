import { View, Text, Pressable, Image } from 'react-native'
import React from 'react'
import { Chat } from '@/types'
import { remoteImageSource } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const ChatItem = ({
  chat,
  onPress,
  isOnline = false,
  myProfileId,
}: {
  chat: Chat;
  onPress: () => void;
  isOnline?: boolean;
  myProfileId?: string;
}) => {
  const participant = chat.member
  const hasUnread = false
  const isTyping = false
  const messagePreview = chat.lastMessage?.content?.trim()
    || chat.lastMessage?.text?.trim()
    || (chat.lastMessage?.fileUrl ? "Sent an image" : "");
  const rawSender = (chat.lastMessage as any)?.sender ?? (chat.lastMessage as any)?.member;
  const senderId =
    typeof rawSender === "string" ? rawSender : String(rawSender?._id ?? "");
  const senderName =
    typeof rawSender === "object" && rawSender?.name
      ? String(rawSender.name)
      : participant?.name || "Member";
  const senderLabel = myProfileId && senderId === myProfileId ? "You" : senderName;
  const previewText = messagePreview ? `${senderLabel}: ${messagePreview}` : "No messages yet";

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
              {previewText}
            </Text>
          )}

        </View>
      </View>
    </Pressable>
  )
}

const areEqual = (
  prev: Readonly<{
    chat: Chat;
    onPress: () => void;
    isOnline?: boolean;
    myProfileId?: string;
  }>,
  next: Readonly<{
    chat: Chat;
    onPress: () => void;
    isOnline?: boolean;
    myProfileId?: string;
  }>
) => {
  const prevLast = prev.chat.lastMessage;
  const nextLast = next.chat.lastMessage;
  return (
    prev.chat._id === next.chat._id &&
    prev.chat.lastMessageAt === next.chat.lastMessageAt &&
    String(prev.chat.member?._id ?? "") === String(next.chat.member?._id ?? "") &&
    String(prev.chat.member?.name ?? "") === String(next.chat.member?.name ?? "") &&
    String(prev.chat.member?.imageUrl ?? "") === String(next.chat.member?.imageUrl ?? "") &&
    String(prevLast?._id ?? "") === String(nextLast?._id ?? "") &&
    String(prevLast?.content ?? prevLast?.text ?? "") === String(nextLast?.content ?? nextLast?.text ?? "") &&
    String(prevLast?.fileUrl ?? "") === String(nextLast?.fileUrl ?? "") &&
    prev.isOnline === next.isOnline &&
    prev.myProfileId === next.myProfileId
  );
};

export default React.memo(ChatItem, areEqual)