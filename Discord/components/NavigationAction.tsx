import { View, Pressable } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'


const NavigationAction = () => {
  const router = useRouter()
  return (
    <View>
      <Pressable className='flex mx-10 h-[48px] w-[48px] rounded-[24px] transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700'
        onPress={() => router.push("/server/create")}
        accessibilityRole="button"
        accessibilityLabel="Create server"
      >
        <Ionicons name={'add'} color={"green"} size={25}/>
      </Pressable>
    </View>
  )
}

export default NavigationAction