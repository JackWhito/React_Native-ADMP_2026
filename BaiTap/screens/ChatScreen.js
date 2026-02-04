import { View, Text, KeyboardAvoidingView, Platform, FlatList, Image } from "react-native";
import ChatHeader from "../components/ChatHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import MessageInput from "../components/MessageInput";
import { useRoute } from "@react-navigation/native";
import { useChats } from "../context/chatContext";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/authContext";

export default function ChatScreen() {
    const route = useRoute();
    const {authUser} = useAuth();
    const {chatId, userAvatar, userFullname} = route.params;
    const listRef = useRef(null);

    const { messages, getMessages, loadingMessages } = useChats();

    useEffect(() => {
        getMessages(chatId);
    }, [chatId])
    const BASE_URL = "http://192.168.1.10:5000";

    return (
        <SafeAreaView className="flex-1 bg-dark" edges={["top", "bottom"]}>
        <ChatHeader chatId={chatId} avatar={userAvatar} fullName={userFullname} />
        <KeyboardAvoidingView
            style={{flex:1}}
            behavior= {Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
            >
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{padding:16}}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: msg }) => {
                    const isMe = msg.sender._id === authUser._id;

                    return (
                    <View className={`flex py-1 ${isMe ? "items-end" : "items-start"}`}>
                        <View
                        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                            isMe
                            ? "bg-blue-600 rounded-tr-sm"
                            : "bg-gray-700 rounded-tl-sm"
                        }`}
                        >
                        {!!msg.text && (
                            <Text className="text-white text-base">
                            {msg.text}
                            </Text>
                        )}
                        {!!msg.image && (
                        <Image
                            source={{ uri: `${BASE_URL}${msg.image}` }}
                            style={{
                            width: 200,
                            aspectRatio: 1,
                            borderRadius: 12,
                            marginTop:3
                            }}
                            resizeMode="cover"
                        />
                        )}
                        </View>
                    </View>
                    );
                }}
                />
            <MessageInput />
        </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
