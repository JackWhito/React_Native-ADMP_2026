import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { Redirect, router, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';

const TabsLayout = () => {
  const { isSignedIn, isLoaded} = useAuth();

  useEffect(() => {
    if(!isSignedIn) router.replace("/(auth)/signin")
  },[isSignedIn]);

  if(!isLoaded) return null;

  return (
    <View style={{ marginTop: 40, flex: 1, flexDirection: 'row' }} >
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        height: 100,
        borderTopColor: '#ccc',
        backgroundColor: '#202020',
      },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
    }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Chats",
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
    </Tabs>
    </View>
  )
}

export default TabsLayout