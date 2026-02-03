import { View, TouchableOpacity, TextInput, Keyboard, ScrollView } from 'react-native'
import { useState} from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import { useChats } from '../context/chatContext'
const MessageInput = () => {
    const [text, setText] = useState("");
    const route = useRoute();
    const {chatId} = route.params;
    const {sendMessage, isSending} = useChats();
    
    const handleSend = async () => {
      if(!text.trim() || isSending) return;
      try {
        await sendMessage({chatId, text, image: null});
        setText("");
        Keyboard.dismiss();
      } catch (error) {
        console.error("Send message error:", error);
      }
    }
  return (
      <View className="flex-row items-end gap-2">
        
        {/* Add image button */}
        <TouchableOpacity className="pb-2">
          <Ionicons name="image-outline" size={24} color="#d4d4d8" />
        </TouchableOpacity>

        {/* Input box */}
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

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || isSending}
          className={`pb-2 ${(!text.trim() || isSending) && "opacity-40"}`}
        >
          <Ionicons name="send" size={24} color="#60a5fa" />
        </TouchableOpacity>

      </View>
  )
}

export default MessageInput