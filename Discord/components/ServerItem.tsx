import { Pressable, Image } from 'react-native'
import React from 'react'
import { Server } from '@/types'

const ServerItem = ({server, onPress}: {server: Server, onPress: () => void}) => {
  return (
    <Pressable
      className="h-[48px] w-[48px] rounded-[24px] overflow-hidden items-center justify-center bg-background dark:bg-neutral-700 self-center"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open server ${server.name}`}
    >
      <Image
        source={{uri: server.imageUrl}}
        style={{ width: 48, height: 48 }}
      />    
    </Pressable>
  )
}

export default ServerItem