import { View, Text, StyleSheet, Button } from "react-native";
import { useAuth } from "../context/authContext.js";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { axiosInstance } from "../lib/axios";

export default function AdminCheckScreen({ navigation }) {
  const { authUser, isAdmin, checkAuth, setAuthUser } = useAuth();

  useEffect(() => {
    checkAuth();
    if (!isAdmin) {
      console.log("User is not admin, redirecting to Home");
    }
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

  return (
    <View style={styles.container}>
      
      <Text style={styles.text}>Welcome, Endministrator {authUser?.fullName}!</Text>
      <Text style={styles.text}>You have {authUser?.role} access.</Text>
      <View style={styles.control}>
        <Button title="Logout" onPress={handleLogout} />
        <Button title="Go to Home" onPress={() => navigation.navigate("Home")} />
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
    width: "70%"
  }
});
