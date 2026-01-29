import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import Toast from "react-native-toast-message";

import HomeScreen from "../screens/HomeScreen.js";
import NotificationsScreen from "../screens/NotificationScreen.js";
import ProfileScreen from "../screens/ProfileScreen.js";
import { useAuth } from "../context/authContext.js";

const Tab = createBottomTabNavigator();

export default function MainTabs({navigation}) {
  const {checkAuth, authUser} = useAuth()
  useEffect(() => {
    checkAuth();
    if(!authUser) {
      Toast.show({
        type: 'error',
        text1: 'Access to Main Tabs denied.'
      });
      navigation.replace("Login");
    }
  }, [checkAuth]);
  return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle:{
            backgroundColor:"#282b30",
            borderTopColor:"#282b30",
            borderTopWidth:1,
            paddingTop:8
          },
          tabBarActiveTintColor: "#7289da",
          tabBarInactiveTintColor: "gray",
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{title:"Home", tabBarIcon:({color, focused, size}) => (
          <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />
        )}} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} options={{title:"Notifications", tabBarIcon:({color, focused, size}) => (
          <Ionicons name={focused ? "notifications" : "notifications-outline"} size={size} color={color} />
        )}} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{title:"Profile", tabBarIcon:({color, focused, size}) => (
          <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
        )}}/>
      </Tab.Navigator>
  );
}
