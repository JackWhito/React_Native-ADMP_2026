import { View, Text, FlatList, Image } from 'react-native'
import { useRoute } from "@react-navigation/native";
import { useChats } from "../../context/chatContext";
import { useEffect } from "react";

export default function LinksTab() {
  const chatId = useRoute().params.chatId;
  const {getLinks, links} = useChats();
  const BASE_URL = "http://192.168.1.10:5000";

  useEffect(() => {
    getLinks(chatId);
  },[chatId]);
  return (
    <FlatList
      data={links}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{padding:16}}
      renderItem={({item}) => (
        <View className="mb-4 bg-zinc-800 rounded-xl p-4">
          
          {/* Sender */}
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: `${BASE_URL}${item.sender.avatar}` }}
              className="w-8 h-8 rounded-full mr-2"
            />
            <Text className="text-white font-semibold">
              {item.sender.fullName}
            </Text>
          </View>

          {/* Links */}
          <View className="space-y-1">
            {item.links.map((link, idx) => (
              <Text
                key={idx}
                className="text-blue-400 text-sm"
                numberOfLines={2}
              >
                {link}
              </Text>
            ))}
          </View>

        </View>
      )}>

    </FlatList>
  );
}
