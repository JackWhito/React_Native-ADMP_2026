import { View, StyleSheet, Image } from "react-native";
import { useEffect } from "react";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Signup");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }} style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  image: {
    width: 64,
    height: 64,
  }
});
