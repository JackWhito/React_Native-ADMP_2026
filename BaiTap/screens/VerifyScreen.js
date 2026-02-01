import { View, Text, StyleSheet, Button, TextInput } from "react-native";
import { publicAxiosInstance } from "../lib/axios";
import { useState } from "react";
import { useAuth } from "../context/authContext.js";
import Toast from "react-native-toast-message";

export default function Verify({ navigation, route }) {
    const [otp, setOtp] = useState("");
    const {setAuthUser} = useAuth();
    const handleVerify = async() => {
        try {
            const res = await publicAxiosInstance.post("/auth/verify-otp", {
                email: route.params.email,
                otp
            });
            setAuthUser(res.data);
            Toast.show({
                type: 'success',
                text1: 'OTP verified successfully.'
            });
            navigation.replace("MainTabs");
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: error.response.data.message
            });
            console.log("Error in OTP verification:", error);
        }
    };

    const handleResend = async () => {
      try {
        const res = await publicAxiosInstance.post("/auth/resend-otp", {
          email: route.params.email
        });
        Toast.show({
            type: 'success',
            text1: 'OTP resent successfully.'
        });
      }
      catch (error) {
        Toast.show({
            type: 'error',
            text1: error.response.data.message
        });
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Verify OTP</Text>
      <TextInput style={styles.textinput} placeholder="Enter OTP" keyboardType="numeric" value={otp} onChangeText={(text) => setOtp(text)} />
      <View style={styles.control}>
        <Button title="Verify" onPress={handleVerify} />
        <Button title="Resend OTP" onPress={handleResend} />
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

