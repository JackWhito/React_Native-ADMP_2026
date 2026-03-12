import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import {  router, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';

const AuthLayout = () => {
    const {isSignedIn, isLoaded} = useAuth();
    useEffect(() => {
      if(isSignedIn) {
        router.replace("/(tabs)")
      }
    }, [isSignedIn]);
    if(!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false}} />
  )
}

export default AuthLayout