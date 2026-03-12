import { View, Text, Pressable, Image } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Server } from '@/types'

const ServerItem = ({server, onPress}: {server: Server, onPress: () => void}) => {
  const name = server.name

  return (
    <Pressable className='flex mx-10 h-[48px] w-[48px] rounded-[24px] transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700'
      onPress={() => console.log("press")}>
      <Image
        source={{uri: server.imageUrl}}
        style={{ width: 48, height: 48 }}
      />    
      </Pressable>
  )
}

export default ServerItem