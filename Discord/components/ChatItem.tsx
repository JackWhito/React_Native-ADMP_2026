import { View, Text } from 'react-native'
import React from 'react'
import { Chat } from '@/types'

const ChatItem = ({chat, onPress}: {chat: Chat, onPress: () => void}) => {
  return (
    <View>
      <Text>ChatItem</Text>
    </View>
  )
}

export default ChatItem