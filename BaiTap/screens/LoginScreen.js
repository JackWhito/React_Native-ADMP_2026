import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Button } from "react-native";
import { axiosInstance } from "../lib/axios";
import { useAuth } from "../context/authContext.js";
import * as SecureStore from 'expo-secure-store';
import Toast from "react-native-toast-message";

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
            const res = await axiosInstance.post("/auth/login-jwt", data);
            await SecureStore.setItemAsync('token', res.data.token);
            setAuthUser(res.data);
            Toast.show({
                type: 'success',
                text1: 'Login successful.'
            });
            navigation.replace("Home");
        }
        catch (error) {
            Toast.show({
                type: 'error',
                text1: error.response.data.message
            });
        }
    }

    const handleLogin = (e) => {
        e.preventDefault();
        const isValid = validateForm();
        if(isValid) login(formData);
    }

  return (
    <View style={styles.container}>
        <Text style={styles.text}>Login Screen</Text>  
        <TextInput autoCapitalize="none" placeholder="Email" style={styles.textinput} onChangeText={(text) => setFormData({...formData, email: text})}/>
        <TextInput autoCapitalize="none" placeholder="Password" style={styles.textinput} secureTextEntry={true} onChangeText={(text) => setFormData({...formData, password: text})}/>
        <View style={styles.control}>
            <Button title="Login" onPress={handleLogin} />
            <Button title="Go to Signup" onPress={() => navigation.replace("Signup")} />
            <Button title="Go to Home" onPress={() => navigation.replace("Home")} />
        </View>
        <View style={styles.control}>
            <Button title="Forget Password" onPress={() => navigation.navigate("ForgetPassword")} style={styles.button} />
            <Button title="Admin Check" onPress={() => navigation.navigate("AdminCheck")} style={styles.button} />
        </View>
    </View>
    );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: "600",
  },
  textinput: {
    width: "80%",
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
    marginTop: 8
  },
  control: {
    margin: 10,
    alignContent: "space-between",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%"
  }
});
