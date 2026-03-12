import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import useAuthSocial from '@/hooks/useSocialAuth';
import {  useRouter } from 'expo-router';

const AuthScreen = () => {
  const {handleSocialAuth, loadingStrategy} = useAuthSocial();
  const isLoading = loadingStrategy !== null;
  const router = useRouter();
  const handleSignIn = () => {
    router.replace("/(auth)/signin")
  }
  return (
    <View className='flex-1 bg-black'>
      <SafeAreaView>
        <View className='flex-row gap-4 mt-10'>
          <Pressable className='flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-white/95' disabled={isLoading}
            onPress={() => !isLoading && handleSocialAuth("oauth_google")}>
              {loadingStrategy === "oauth_google" ? (<ActivityIndicator size="small"/>):(<Text>Continue with Google</Text>)}
          </Pressable>

          <Pressable className='flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-white/95' disabled={isLoading}
            onPress={handleSignIn}>
              <Text>Sign in</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </View>
  )
}

export default AuthScreen