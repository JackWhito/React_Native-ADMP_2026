import { View, Text, ScrollView, TouchableOpacity, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useEffect, useState } from "react";

import {axiosInstance} from "../lib/axios.js"
import Toast from "react-native-toast-message";


export default function UpdateProfile({navigation}) {
    const [email, setEmail] = useState(null);
    const [about, setAbout] = useState(null);
    const [userUpdate, setUserUpdate] = useState({})
    const {top} = useSafeAreaInsets();
    const { checkAuth, setAuthUser, userSQL, setUserSQL } = useAuth();
    useEffect(() => {
        checkAuth();
        setUserUpdate(prev => ({...prev, userId: userSQL?._id}));
        if (!userSQL) {
        navigation.replace("Login");
        }
    }, []);
    const update = async (data) => {
        try{
            const res = await axiosInstance.put("/auth/update",data)
            setAuthUser(res.data);
            Toast.show({
                type: 'success',
                text1: "Update success"
            })
            setUserSQL(res.data)
            navigation.replace("MainTabs")
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: error.response.data.message || 'Login failed.'
            });
        }
    }
    const handleSave = async (e) => {
        e.preventDefault();
        if(!userUpdate.fullName)
            navigation.replace("MainTabs")
        else update(userUpdate)
    }

  
    return (
        <View className="flex-1 bg-zinc-900" style={{ paddingTop: top }}>
        <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        >
        {/* ---------- NAV BAR ---------- */}
        <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-white text-lg font-semibold"></Text>

            <View className="flex-row gap-3">
            <TouchableOpacity className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center">
                <Ionicons name="save" size={20} color="white" onPress={handleSave} />
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
            <TouchableOpacity className="mt-2 w-1/2 h-[40px] rounded-full bg-zinc-800 
                flex-row items-center justify-start pl-3 gap-2">
                <Ionicons name="add-circle" color="#9ca3af" size={20} />
                <Text className="text-gray-400 text-sm italic text-[15px]">Add Status</Text>
            </TouchableOpacity>
            </View>
        </View>

        {/* ---------- ACCOUNT INFO ---------- */}
        <View className="flex-col">
            <Text className="text-white pl-5 pt-3 text-[25px]" >{userSQL?.fullName}</Text>
        </View>
            <View className="mt-5 mx-4 rounded-2xl bg-zinc-800 p-4">
                {/* Full Name */}
                <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-1">Full name</Text>
                    <TextInput
                    onChangeText={(text) => setUserUpdate({...userUpdate, fullName: text})}
                    placeholder={userSQL?.fullName}
                    placeholderTextColor="#71717a"
                    className="h-[44px] rounded-xl bg-zinc-900 px-4 text-white"
                    />
                </View>

                {/* Email */}
                <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-1">Email</Text>
                    <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={userSQL?.email}
                    placeholderTextColor="#71717a"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="h-[44px] rounded-xl bg-zinc-900 px-4 text-white"
                    />
                </View>

                {/* Desc */}
                <View className="mb-4">
                    <Text className="text-zinc-400 text-sm mb-1">More about me</Text>
                    <TextInput
                    value={about}
                    onChangeText={setAbout}
                    placeholder="More about yourself..."
                    placeholderTextColor="#71717a"
                    multiline
                    textAlignVertical="top"
                    className="h-[120px] rounded-xl bg-zinc-900 px-4 py-3 text-white"
                    />
                </View>

            </View>
            </ScrollView>
        </View>
    );
}
