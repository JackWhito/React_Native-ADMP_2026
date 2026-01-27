import { View, Text, StyleSheet, Button, TextInput } from "react-native";
import { axiosInstance } from "../lib/axios";
import { useState } from "react";
import { useAuth } from "../context/authContext.js";
import Toast from "react-native-toast-message";

export default function ResetPassword({ navigation, route }) {
    const [newPassword, setNewPassword] = useState("");
    const {setAuthUser} = useAuth();
    const handleResetPassword = async() => {
        try {
            const isValid = validateForm();
            if(!isValid) return;
            const res = await axiosInstance.post("/auth/reset-password", {
                userId: route.params.userId,
                newPassword
            });
            setAuthUser(res.data);
            Toast.show({
                type: 'success',
                text1: 'Password reset successfully.'
            });
            navigation.replace("Home");
        } catch (error) {
            console.log("Error in password reset:", error);
        }
    };
    const validateForm = () => {
        if(!newPassword.trim()) return Toast.show({
            type: 'error',
            text1: 'New password is required.'
        });
        if(newPassword.length < 6) return Toast.show({
            type: 'error',
            text1: 'Password must be at least 6 characters.'
        });
        return true;
    }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Reset Password</Text>
      <TextInput autoCapitalize="none" placeholder="New Password" style={styles.textinput} value={newPassword} onChangeText={(text) => setNewPassword(text)} secureTextEntry={true} />
      <View style={styles.control}>
        <Button title="Reset Password" onPress={handleResetPassword} />
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