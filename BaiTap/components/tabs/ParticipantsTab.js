import { View, Text, Image } from "react-native";
import { useEffect} from 'react';
import {useChats} from "../../context/chatContext.js"
import { useRoute } from "@react-navigation/native";

export default function ParticipantsTab() {
  const chatId = useRoute().params.chatId
  const BASE_URL = "http://192.168.1.10:5000";

  const {getParticipants, participants, pCount} = useChats();
  useEffect(() => {
      getParticipants(chatId);
  }, [chatId])

  return (
    <View className="flex-1 p-4">
      <Text className="text-white">Participants - {pCount} </Text>
      <View className="bg-sidebar rounded-md mt-3">
      {participants.map((user) => {
          const avatarUri = user?.avatar
            ? `${BASE_URL}${user.avatar}`
            : null;

          return (
            <View
              key={user._id}
              className="w-full p-3 flex-row items-center gap-3"
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
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
