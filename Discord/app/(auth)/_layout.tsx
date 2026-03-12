import { View, Text } from 'react-native'
import React from 'react'
import {  router, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';

const AuthLayout = () => {
    const {isSignedIn, isLoaded} = useAuth();
    if(!isLoaded) return null;
    if(isSignedIn) {
        router.replace("/(tabs)")
    }
  return (
    <Stack screenOptions={{ headerShown: false}} />
  )
}

export default AuthLayout