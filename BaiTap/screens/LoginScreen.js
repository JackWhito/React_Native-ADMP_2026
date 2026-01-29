import { useState } from "react";
import { View, Text, TextInput, Pressable, Image } from "react-native";
import { TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { publicAxiosInstance } from "../lib/axios";
import { useAuth } from "../context/authContext.js";
import * as SecureStore from "expo-secure-store";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "../global.css"
import { saveAuthUser } from "../db/authDB.js";

export default function LoginScreen({ navigation }) {
    const {setAuthUser} = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const validateForm = () => {
        if(!formData.email.trim()) return Toast.show({
            type: 'error',
            text1: 'Email is required.'
        });
        if(!formData.password.trim()) return Toast.show({
            type: 'error',
            text1: 'Password is required.'
        });
        if(!/\S+@\S+\.\S+/.test(formData.email)) return Toast.show({
            type: 'error',
            text1: 'Email is invalid.'
        });
        if(formData.password.length < 6) return Toast.show({
            type: 'error',
            text1: 'Password must be at least 6 characters.'
        });
        return true;
    }
    
    const login = async (data) => {
        try {
            const res = await publicAxiosInstance.post("/auth/login-jwt", data);
            await SecureStore.setItemAsync('token', res.data.token);
            await setAuthUser(res.data);
            await saveAuthUser(res.data);
            Toast.show({
                type: 'success',
                text1: 'Login successful.'
            });
            navigation.replace("Splash");
        }
        catch (error) {
            Toast.show({
                type: 'error',
                text1: error.response.data.message || 'Login failed.'
            });
        }
    }

    const handleLogin = (e) => {
        e.preventDefault();
        const isValid = validateForm();
        if(isValid) login(formData);
    }

    const {top} = useSafeAreaInsets();
  return (
    <View style={{paddingTop:top}} className='flex-1 justify-center items-center bg-primary'>
        <Text className="text-[24px] text-white">Login</Text>
        <TextInput autoCapitalize="none" placeholder="Email" placeholderTextColor="white" className='h-[40] w-4/5 border-2 border-gray-50 my-[8] text-white' onChangeText={(text) => setFormData({...formData, email: text})}/>
        <TextInput autoCapitalize="none" placeholder="Password" placeholderTextColor="white" className='h-[40] w-4/5 border-2 border-gray-50 my-[8] text-white' secureTextEntry={true} onChangeText={(text) => setFormData({...formData, password: text})} />
        <View className='flex-row justify-between items-center m-[10] content-between w-4/5'>
            <TouchableOpacity className="mt-[12px] w-[148px] h-[48px] rounded-[12px] bg-highlight justify-center items-center mb-[16px] flex-row " onPress={handleLogin}>
               <Image source={require("../assets/Discord-Symbol-White.png")} style={{width:35, height:25}} />
                <Text className='text-white ml-[4px]'>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mt-[12px] w-[148px] h-[48px] rounded-[12px] bg-highlight justify-center items-center mb-[16px] flex-row" onPress={() => navigation.replace("Signup")}>
                <Ionicons name="log-in" size={27} color="white" />
                <Text className='text-white ml-[4px]'>Sign up</Text>
            </TouchableOpacity>
        </View>
        <Pressable onPress={() => navigation.replace("ForgetPassword")}>
            <Text className="text-highlight" >Forget Password?</Text>
        </Pressable>
    </View>
    );
}
