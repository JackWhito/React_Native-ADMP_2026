import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import "./global.css"

import SplashScreen from "./screens/SplashScreen.js";
import SignupScreen from "./screens/SignupScreen.js";
import LoginScreen from "./screens/LoginScreen.js";
import VerifyScreen from "./screens/VerifyScreen.js";
import ForgetPasswordScreen from "./screens/ForgetPasswordScreen.js";
import ResetPasswordScreen from "./screens/ResetPasswordScreen.js";
import AdminCheckScreen from "./screens/AdminCheckScreen.js";

import { AuthProvider } from "./context/authContext.js";
import MainTabs from "./navigation/MainTabs.js";
import ProfileScreen from "./screens/ProfileScreen.js";
import Toast from "react-native-toast-message";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";

import { initAuthDB } from "./db/authDB.js";
import UpdateProfile from "./screens/UpdateProfileScreen.js";
import ChatScreen from "./screens/ChatScreen.js";
import HomeScreen from "./screens/HomeScreen.js";
import { ChatProvider } from "./context/chatContext.js";
import ChatDetailScreen from "./screens/ChatDetailScreen.js";

const Stack = createNativeStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false)
  useEffect(() => {
    (async () => {
      try {
        await initAuthDB();
        setDbReady(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  if (!dbReady) {
    return <ActivityIndicator />;
  }
  return (
      <View style={{flex:1, backgroundColor:"#36393e"}}>
      <NavigationContainer>
      <AuthProvider>
      <ChatProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Verify" component={VerifyScreen} />
        <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="AdminCheck" component={AdminCheckScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Update" component={UpdateProfile} options={{animation:"slide_from_right"}} />
        <Stack.Screen name="ChatContainer" component={ChatScreen} options={{animation:"slide_from_right"}} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      </Stack.Navigator>
      </ChatProvider>
      </AuthProvider>
      <Toast/>
    </NavigationContainer>
    </View>
  );
}
