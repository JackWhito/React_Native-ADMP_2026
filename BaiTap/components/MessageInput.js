import { View, TouchableOpacity, TextInput, Keyboard, Image } from 'react-native'
import { useState} from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import { useChats } from '../context/chatContext'
import * as ImagePicker from "expo-image-picker"
const MessageInput = () => {
    const [text, setText] = useState("");
    const [image, setImage] = useState(null);
    const route = useRoute();
    const {chatId} = route.params;
    const {sendMessage, isSending} = useChats();

    const pickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0]);
      }
    };
    
    const handleSend = async () => {
      if (isSending) return;
      if (!text.trim() && !image) return;
      try {
        const formData = new FormData();
        formData.append("chatId", chatId);
        if (text.trim()) formData.append("text", text);

        if (image) {
          formData.append("image", {
            uri: image.uri,
            name: "photo.jpg",
            type: "image/jpeg",
          });
        }

        await sendMessage(formData);

        setText("");
        setImage(null);
        Keyboard.dismiss();
      } catch (error) {
        console.error("Send message error:", error);
      }
    }
  return (
    <View className="w-full bg-sidebar px-3 pt-2">
    {image && (
      <View className="mt-2 relative self-start">
        
        {/* Preview */}
        <Image
          source={{ uri: image.uri }}
          className="w-20 h-20 rounded-lg"
        />

        {/* Remove button */}
        <TouchableOpacity
          onPress={() => setImage(null)}
          className="absolute -top-2 -right-2 bg-black/70 rounded-full p-1"
        >
          <Ionicons name="close" size={14} color="white" />
        </TouchableOpacity>

      </View>
    )}
      <View className="flex-row items-end gap-2">

        {/* Image button */}
        <TouchableOpacity onPress={pickImage} className="pb-2">
          <Ionicons name="image-outline" size={24} color="#d4d4d8" />
        </TouchableOpacity>

        {/* Text input */}
        <View className="flex-1 bg-zinc-800 rounded-2xl px-4 py-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor="#a1a1aa"
            multiline
            className="text-white max-h-[120px]"
          />
        </View>

        {/* Send */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={(!text.trim() && !image) || isSending}
          className={`pb-2 ${(!text.trim() && !image) && "opacity-40"}`}
        >
          <Ionicons name="send" size={24} color="#60a5fa" />
        </TouchableOpacity>

      </View>

    </View>
  )
}

export default MessageInput