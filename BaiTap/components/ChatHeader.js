import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { axiosInstance } from "../lib/axios";

export default function ChatHeader({chatId ,avatar, fullName}) {
  const navigation = useNavigation();

  const BASE_URL = "http://192.168.1.10:5000";
  return (
    <View className="h-14 flex-row items-center bg-neutral-900 px-3">
      {/* Back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="p-1"
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>


      <TouchableOpacity className="flex-row flex-1 items-center" onPress={() => navigation.navigate("ChatDetail",{chatId, avatar, fullName})}>
      {/* Avatar */}
      <Image
        source={{uri: `${BASE_URL}${avatar}`}}
        className="w-9 h-9 rounded-full mx-2"
      />

      {/* Full name */}
      <Text
        className="flex-1 text-white text-base font-semibold"
        numberOfLines={1}
      >
        {fullName}
      </Text>
      </TouchableOpacity>

      <View className="flex-row ml-auto">
      {/* Call button */}
      <TouchableOpacity className="p-2">
        <Ionicons name="call" size={22} color="white" />
      </TouchableOpacity>

      {/* Search button */}
      <TouchableOpacity className="p-2">
        <Ionicons name="search" size={22} color="white" />
      </TouchableOpacity>
      </View>
    </View>
  );
}
