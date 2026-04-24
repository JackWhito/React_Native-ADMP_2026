import React, { useEffect } from 'react'
import {  router, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useLocalAuth } from '@/contexts/LocalAuthContext';

const AuthLayout = () => {
    const { isSignedIn, isLoaded } = useAuth();
    const { isLocalAuthed, isHydrated: localReady } = useLocalAuth();
    useEffect(() => {
      if (isLocalAuthed || isSignedIn) {
        router.replace("/(tabs)")
      }
    }, [isLocalAuthed, isSignedIn]);
    if(!isLoaded || !localReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false}} />
  )
}

export default AuthLayout