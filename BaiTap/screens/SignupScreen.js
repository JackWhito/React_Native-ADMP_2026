import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Button } from "react-native";
import { axiosInstance } from "../lib/axios";
import Toast from "react-native-toast-message";

export default function SignupScreen({ navigation }) {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: ""
    });


    const validateForm = () => {
        if(!formData.fullName || !formData.email || !formData.password) {
            Toast.show({
                type: 'error',
                text1: 'All fields are required.'
            });
            return false;
        }
        return true;
    }
    
    const signup = async (data) => {
        try {
            const res = await axiosInstance.post("/auth/signup-jwt", data);
            Toast.show({
                type: 'success',
                text1: 'Signup successful.'
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

    const handleSignup = (e) => {
        e.preventDefault();

        const isValid = validateForm();

        if(isValid) signup(formData);
    }

  return (
    <View style={styles.container}>
        <Text style={styles.text}>Signup Screen</Text>  
        <TextInput autoCapitalize="none" placeholder="Username" style={styles.textinput} onChangeText={(text) => setFormData({...formData, fullName: text})}/>
        <TextInput autoCapitalize="none" placeholder="Email" style={styles.textinput} onChangeText={(text) => setFormData({...formData, email: text})}/>
        <TextInput autoCapitalize="none" placeholder="Password" style={styles.textinput} secureTextEntry={true} onChangeText={(text) => setFormData({...formData, password: text})}/>
        <View style={styles.control}>
            <Button title="Sign Up" onPress={handleSignup} />
            <Button title="Go to Login" onPress={() => navigation.replace("Login")} style={styles.button} />
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
