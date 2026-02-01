import { View, Text, Button } from "react-native";
import { useAuth } from "../context/authContext.js";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { getAuthUser } from "../db/authDB.js";

export default function AdminCheckScreen({ navigation }) {
  const { checkAuth, authUser } = useAuth();

  useEffect(() => {
    checkAuth();
    if(!authUser || authUser.role !== "admin") {
      Toast.show({
        type: 'error',
        text1: 'Access denied. Admins only.'
      });
      navigation.replace("MainTabs");
    }
  }, []);

  return (
    <View className="flex-1 justify-center items-start pl-[20px] bg-primary">
      <Text className="text-[24px] font-semibold text-white">Welcome, Endministrator {authUser?.fullName}!</Text>
      <Text className="text-[24px] font-semibold text-white">You have {authUser?.role} access.</Text>
      <View className="m-[12px] content-between flex-row justify-between w-2/3">
        <Button title="Go to Home" onPress={() => navigation.replace("MainTabs")} />
      </View>
    </View>
  );
}

