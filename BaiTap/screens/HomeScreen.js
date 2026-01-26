import { View, Text, StyleSheet, Button } from "react-native";
import { useAuth } from "../context/authContext.js";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { axiosInstance } from "../lib/axios";

export default function HomeScreen({ navigation }) {
  const { authUser, checkAuth, setAuthUser } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    try{
      await axiosInstance.post("/auth/logout");
      setAuthUser(null);
      Toast.show({
        type: "success",
        text1: "Logged out successfully.",
      });
    navigation.replace("Login");
    } catch (error) {
      console.log("Error in logout:", error);
      Toast.show({
        type: 'error',
        text1: 'Logout failed.'
      });
    }
  };
  
  if (!authUser) {
    navigation.replace("Login");
  }
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Đoàn Nguyễn Nam Trung</Text>
      <Text style={styles.text}>Mã số sinh viên: 21110333</Text>
      <Text style={styles.text}>Nhóm: 04</Text>
      <Text style={styles.text}>Đề tài: Xây dựng app Discord</Text>
      
      <Text style={styles.text}>Welcome, {authUser?.fullName}!</Text>
      <View style={styles.control}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "left",
    paddingLeft: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: "600",
  },
  control: {
    margin: 12,
    alignContent: "space-between",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%"
  }
});
