import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useChats } from "../context/chatContext";

export default function HomeArea() {
  const {chats, isLoadingChats} = useChats();
  const navigation = useNavigation()
  const BASE_URL = "http://192.168.1.10:5000";
  if(isLoadingChats) {
    return (
      <View className="w-full items-center justify-center py-4">
        <Text className="text-zinc-400">Loading chats...</Text>
      </View>
    );
  }
  return (
    <View className="flex-1 bg-zinc-900">

      {/* Title */}
      <View className="px-[16px] py-[12px] border-zinc-800">
        <Text className="text-white text-[18px] font-semibold">
          Chat Messages
        </Text>
      </View>

      {/* Search bar */}
      <View className="h-[48px] px-[16px] flex-row items-center border-zinc-800">
        <TouchableOpacity
            activeOpacity={0.7}
            className="w-[38] h-[38] rounded-[24px] bg-sidebar justify-center items-center"
        >
            <Ionicons name="search" size={18} color="white"/>
        </TouchableOpacity>
        <TouchableOpacity
            activeOpacity={0.7}
            className="ml-[8px] flex-row items-center justify-center bg-sidebar rounded-[24px] w-[240px] h-[38px]"
        >
            <Ionicons name="person-add" size={18} color="white" />
            <Text className="text-white ml-[12px]">Add Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable chat list */}
      <ScrollView
        className="overflow-y-auto w-full py-2"
        contentContainerStyle={{ padding: 3, gap: 2 }}
        showsVerticalScrollIndicator={false}
      >
        {chats.map((chat) => {
          const user = chat.participant;
          const isSender = chat.lastMessage.sender._id === user._id
          const avatarUri = user?.avatar
            ? `${BASE_URL}${user.avatar}`
            : null;
          const chatId=chat._id;
          const userAvatar = user.avatar;
          const userFullname = user.fullName

          return (
            <TouchableOpacity
              key={chat._id}
              className="w-full p-3 flex-row items-start gap-3"
              onPress={() => navigation.navigate("ChatContainer",{chatId, userAvatar, userFullname})}
            >
              {/* Avatar */}
              <View className="w-[40px] h-[40px] rounded-full bg-zinc-700 items-center justify-center overflow-hidden">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    className="w-full h-full"
                  />
                ) : (
                  <Ionicons name="person" size={26} color="#d4d4d8" />
                )}
              </View>

              {/* User info */}
              <View className="flex-1 min-w-0 justify-center mt-1">
                <Text
                  className="text-white text-[13px] font-medium"
                  numberOfLines={1}
                >
                  {user?.fullName || "Unknown User"}
                </Text>

                <Text
                  className="text-zinc-400 text-[12px]"
                  numberOfLines={1}
                >
                  {isSender 
                    ? `${user.fullName}: ${chat.lastMessage?.text}`
                    : `Me: ${chat.lastMessage?.text}`
                  }
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

    </View>
  );
}

