import { View, Text, Image } from 'react-native'
import ChatDetailHeader from '../components/ChatDetailHeader'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import { useRoute } from '@react-navigation/native'


import ChatDetailTabs from '../components/ChatDetailTabs.js'
import ParticipantsTab from "../components/tabs/ParticipantsTab.js"
import MediaTab from "../components/tabs/MediaTab.js"
import LinksTab from '../components/tabs/LinksTab.js'
import { useChats } from '../context/chatContext.js'

const ChatDetailScreen = () => {
  const chatId = useRoute().params.chatId;
  const avatar = useRoute().params.avatar;
  const fullName = useRoute().params.fullName;
  const BASE_URL = "http://192.168.1.10:5000";
  const [activeTab, setActiveTab] = useState("participants");

  const renderContent = () => {
  switch (activeTab) {
    case "participants":
      return <ParticipantsTab />;
    case "media":
      return <MediaTab />;
    case "links":
      return <LinksTab />;
    default:
      return null;
  }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark" edges={["top", "bottom"]}>
      <ChatDetailHeader/>

      <View className="flex-row items-center content-start px-4 mt-3">
        {/* Avatar */}
        <Image
          source={{uri: `${BASE_URL}${avatar}`}}
          className="w-16 h-16 rounded-full mx-2"
        />

        {/* Full name */}
        <Text
          className="text-white text-[16px] font-semibold"
          numberOfLines={1}
        >
          {fullName}
        </Text>
      </View>

      <ChatDetailTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <View className="flex-1">
        {renderContent()}
      </View>

    </SafeAreaView>
  )
}

export default ChatDetailScreen