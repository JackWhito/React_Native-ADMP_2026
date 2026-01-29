import { View, Image } from "react-native";
import { useEffect } from "react";
import { useAuth } from "../context/authContext";

export default function SplashScreen({ navigation }) {
  const {authUser, checkAuth} = useAuth()

  useEffect(() => {
    checkAuth()
    if(!authUser)
    {
      const timer = setTimeout(() => {
        navigation.replace("Login");
      }, 3000);
      return () => clearTimeout(timer);
    }
    if(authUser.role === "admin")
    {
      const timer = setTimeout(() => {
        navigation.replace("AdminCheck");
      }, 3000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      navigation.replace("MainTabs");
    }, 3000);
    return () => clearTimeout(timer);

  }, []);

  return (
    <View className="bg-primary flex-1 justify-center items-center">
      <Image source={require("../assets/Discord.png")} style={{width:80, height:60}}></Image>
    </View>
  );
}
