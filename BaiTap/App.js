import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

import SplashScreen from "./screens/SplashScreen.js";
import HomeScreen from "./screens/HomeScreen.js";
import SignupScreen from "./screens/SignupScreen.js";
import LoginScreen from "./screens/LoginScreen.js";
import VerifyScreen from "./screens/VerifyScreen.js";
import ForgetPasswordScreen from "./screens/ForgetPasswordScreen.js";
import ResetPasswordScreen from "./screens/ResetPasswordScreen.js";
import { AuthProvider } from "./context/authContext.js";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Verify" component={VerifyScreen} />
        <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
    </AuthProvider>
  );
}
