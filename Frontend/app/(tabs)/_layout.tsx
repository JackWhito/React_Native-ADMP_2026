import { View } from 'react-native'
import React, { useEffect } from 'react'
import { router, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useNotifications } from '@/hooks/useNotification';

const TabsLayout = () => {
  const { isSignedIn, isLoaded} = useAuth();
  const { data: notifications } = useNotifications();
  const hasNotifications = (notifications ?? []).some((n) => !n.isRead);

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
      tabBarActiveTintColor: '#E4E4E7',
      tabBarInactiveTintColor: '#A1A1AA',
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
              <View>
                <Ionicons
                  name={focused ? "notifications" : "notifications-outline"}
                  size={size}
                  color={color}
                />
                {hasNotifications ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      right: -1,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#F43F5E",
                    }}
                  />
                ) : null}
              </View>
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