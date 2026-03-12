import { View, Text, Pressable } from 'react-native'
import React from 'react'
import { useAuth } from "@clerk/expo";

const Profile = () => {
  const {signOut} = useAuth();
  return (
    <View>
      <Text>Profile</Text>
      <Pressable onPress={() => signOut()} >
        <Text>Sign Out</Text>
      </Pressable>
    </View>
  )
}

export default Profile