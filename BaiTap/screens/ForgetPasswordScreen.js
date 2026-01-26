import { View, Text, StyleSheet, Button, TextInput } from "react-native";
import { axiosInstance } from "../lib/axios";
import { useState } from "react";
import { useAuth } from "../context/authContext.js";
import Toast from "react-native-toast-message";

export default function ForgetPassword({ navigation, route }) {
    const [otp, setOtp] = useState("");
    const [email, setEmail] = useState("");
    const {setAuthUser} = useAuth();
    const handleVerify = async() => {
        try {
            const res = await axiosInstance.post("/auth/verify-otp", {
                email: email,
                otp
            });
            setAuthUser(res.data);
            Toast.show({
                type: 'success',
                text1: 'OTP verified successfully.'
            });
            navigation.replace("ResetPassword", {userId: res.data._id});
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: error.response.data.message
            });
            console.log("Error in handleVerify:", error.response.data.message);
        }
    };

    const handeSendOTP = async () => {
        try {
            const res = await axiosInstance.post("/auth/forget-password", {
                email
            });
            Toast.show({
                type: 'success',
                text1: 'OTP sent to email.'
            });
        }
        catch (error) {
            console.log("Error in sending OTP:", error.response.data.message);
            Toast.show({
                type: 'error',
                text1: error.response.data.message
            });
        }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Forget Password</Text>
      <TextInput autoCapitalize="none" placeholder="Email" style={styles.textinput} value={email} onChangeText={(text) => setEmail(text)} />
      <View style={styles.control}>
        <Button title="Send OTP" onPress={handeSendOTP} />
      </View>
      <Text style={styles.text}>Enter OTP</Text>
      <TextInput autoCapitalize="none" placeholder="Enter OTP" keyboardType="numeric" style={styles.textinput} value={otp} onChangeText={(text) => setOtp(text)} />
      <View style={styles.control}>
        <Button title="Verify" onPress={handleVerify} />
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

