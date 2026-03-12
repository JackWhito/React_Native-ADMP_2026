import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import NavigationSideBar from '../navigation/NavigationSideBar'
import ChatItem from '@/components/ChatItem'
import { useChat } from '@/hooks/useChat' 

const ChatTab = () => {
  const {data:conversations, isLoading, error} = useChat();
  if(isLoading) return (
      <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F4A261" />        
      </View>
  )
  if(error){
      return (
          <View className="flex-1 items-center justify-center">
              <Text className="text-red-500">Failed to load</Text>
          </View>
      )
  }

  const handleChatPress = (item) => {

  }
  return (
  <View className="flex-1 flex-row bg-zinc-900">

    <View className="w-[72px]">
      <NavigationSideBar />
    </View>

    <View className='flex-col flex-1'>
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

      <FlatList
        data = {conversations}
        keyExtractor={(item) => item._id}
        renderItem={({item}) => <ChatItem chat={item} onPress={() => handleChatPress(item)} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{paddingHorizontal:10, paddingTop:10, paddingBottom:10}}
        ListEmptyComponent={<Text className="text-white">No Chat found</Text>}
      />
    </View>

  </View>
  )
}

export default ChatTab