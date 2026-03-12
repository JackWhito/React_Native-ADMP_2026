import { View, Text, Pressable } from 'react-native'
import React from 'react'
import { Button } from './ui/button'
import { Ionicons } from '@expo/vector-icons'


const NavigationAction = () => {
  return (
    <View>
      <Pressable className='flex mx-10 h-[48px] w-[48px] rounded-[24px] transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700'
        onPress={() => console.log("press")}>
        <Ionicons name={'add'} color={"green"} size={25}/>
      </Pressable>
    </View>
  )
}

export default NavigationAction