import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function ChatDetailHeader() {
  const navigation = useNavigation();
  return (
    <View className="h-14 flex-row items-center bg-neutral-900 px-3">
      {/* Back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="p-1"
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>


      <View className="flex-row ml-auto">

      {/* Search button */}
      <TouchableOpacity className="p-2">
        <Ionicons name="settings" size={22} color="white" />
      </TouchableOpacity>
      </View>
    </View>
  );
}
