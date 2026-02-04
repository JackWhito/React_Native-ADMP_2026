import { FlatList, Image, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useChats } from "../../context/chatContext";
import { useEffect } from "react";
export default function MediaTab() {
  const chatId = useRoute().params.chatId;
  const {getImages, images} = useChats();
  const BASE_URL = "http://192.168.1.10:5000";

  useEffect(() => {
    getImages(chatId);
  },[chatId]);

  return (
    <FlatList
      data={images}
      numColumns={3}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 8 }}
      renderItem={({ item }) => (
        <View className="relative m-1">
          
          {/* Image */}
          <Image
            source={{ uri: `${BASE_URL}${item.image}` }}
            className="w-32 h-32 rounded-lg"
            resizeMode="cover"
          />

          {/* Sender avatar (top-right) */}
          <Image
            source={{ uri: `${BASE_URL}${item.sender.avatar}` }}
            className="w-6 h-6 rounded-full absolute top-1 right-1 border-2 border-black"
          />

        </View>
      )}
    />
  );
}
