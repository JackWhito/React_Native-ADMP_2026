import { Pressable, Image, View } from 'react-native'
import React from 'react'
import { Server } from '@/types'
import { remoteImageSource } from '@/lib/utils'

const ServerItem = ({server, onPress}: {server: Server, onPress: () => void}) => {
  const src = remoteImageSource(server.imageUrl)
  return (
    <Pressable
      className="h-[48px] w-[48px] rounded-[24px] overflow-hidden items-center justify-center bg-background dark:bg-neutral-700 self-center"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open server ${server.name}`}
    >
      {src ? (
        <Image source={src} style={{ width: 48, height: 48 }} />
      ) : (
        <View
          className="w-[48px] h-[48px] items-center justify-center bg-[#313338]"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </Pressable>
  )
}

export default ServerItem