import { View, Text, FlatList } from 'react-native'
import React from 'react'
import NavigationSideBar from '../navigation/NavigationSideBar'

const ChatTab = () => {
  return (
  <View className="flex-1 flex-row">

    <View className="w-[72px]">
      <NavigationSideBar />
    </View>

    <View className="flex-1">
      <Text className="text-lg font-semibold p-4">Chat</Text>
    </View>

  </View>
  )
}

export default ChatTab