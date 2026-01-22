import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Button } from "react-native";
import { axiosInstance } from "../lib/axios";
import Toast from "react-native-toast-message";

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    
    const login = async (data) => {
        try {
            const res = await axiosInstance.post("/auth/login", data);
            Toast.show({
                type: 'success',
                text1: 'Login successful.'
            });
            navigation.replace("Home");
        }
        catch (error) {
            Toast.show({
                type: 'error',
                text1: res.error.response.data.message
            });
        }
    }

    const handleLogin = (e) => {
        e.preventDefault();
        const formData = {
            email: email,
            password: password
        };
        setFormData(formData);

        login(formData);
    }

  return (
    <View style={styles.container}>
        <Text style={styles.text}>Login Screen</Text>  
        <TextInput autoCapitalize="none" placeholder="Email" style={styles.textinput} onChangeText={setEmail}/>
        <TextInput autoCapitalize="none" placeholder="Password" style={styles.textinput} secureTextEntry={true} onChangeText={setPassword}/>
        <View style={styles.control}>
            <Button title="Login" onPress={handleLogin} />
            <Button title="Go to Signup" onPress={() => navigation.replace("Signup")} />
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
    margin: 12,
    alignContent: "space-between",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%"
  }
});
