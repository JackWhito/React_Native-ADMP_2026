import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {publicAxiosInstance} from "../lib/axios.js"
import Toast from "react-native-toast-message";

import { clearAuthUser } from "../db/authDB.js";

export default function ProfileScreen({navigation}) {
  const {top} = useSafeAreaInsets();
  const { checkAuth, setAuthUser, setIsCheckingAuth, userSQL, setUserSQL, authUser } = useAuth();
  useEffect(() => {
    checkAuth();
    if (!authUser) {
      navigation.replace("Login");
    }
  }, []);
  

  const logout = async () => {
    try{
      await SecureStore.deleteItemAsync('token');
      await publicAxiosInstance.post("/auth/logout");
      await clearAuthUser();
      await setUserSQL(null);
      setAuthUser(null);
      Toast.show({
        type: "success",
        text1: "Logged out successfully.",
      });
      setIsCheckingAuth(false);
      navigation.replace("Login");
    } catch (error) {
      console.log("Error in logout:", error);
      Toast.show({
        type: 'error',
        text1: 'Logout failed.'
      });
    }
  }
  const handleLogout = async (e) => {
    e.preventDefault();
    logout();
  }

  const handleUpdate = async (e) => {
    e.preventDefault();
    navigation.navigate("Update");
  }
  return (
    <View className="flex-1 bg-zinc-900" style={{ paddingTop: top }}>
      
      {/* ---------- NAV BAR ---------- */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-white text-lg font-semibold"></Text>

        <View className="flex-row gap-3">
          <TouchableOpacity className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center" onPress={handleLogout}>
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center">
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- PROFILE HEADER ---------- */}
      <View className="flex-row items-center px-4 mt-6">
        
        {/* Avatar */}
        <TouchableOpacity className="w-[80px] h-[80px] rounded-full bg-zinc-700 items-center justify-center">
            <Ionicons name="person" size={50} color="#d4d4d8" />
        </TouchableOpacity>

        {/* Name + Edit */}
        <View className="flex-1 ml-4 pt-4">

          <TouchableOpacity className="mt-2 w-full h-[40px] rounded-full bg-zinc-800 
             flex-row items-center justify-start pl-3 gap-2">
            <Ionicons name="add-circle" color="#9ca3af" size={20} />
            <Text className="text-gray-400 text-sm italic text-[15px]">What are you thinking?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- ACCOUNT INFO ---------- */}
      <View className="flex-col">
        <Text className="text-white pl-5 pt-3 text-[25px]" >{userSQL?.fullName}</Text>
      </View>

      <View className="pt-[10px] flex-col items-center justify-center">
        <TouchableOpacity className="w-11/12 h-[40px] rounded-full bg-highlight
            flex-row items-center justify-center pl-3 gap-2" onPress={handleUpdate}>
          <Ionicons name="pencil" color="white" size={25} />
          <Text className="text-white text-sm italic text-[15px]">Update Profile</Text>
        </TouchableOpacity>
      </View>     
 
    </View>
  );
}
