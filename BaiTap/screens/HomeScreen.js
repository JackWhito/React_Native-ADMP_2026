import { View, Text, StyleSheet, Button } from "react-native";

export default function HomeScreen({ navigation }) {
  const handleLogout = () => {
    navigation.replace("Login");
  };
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Đoàn Nguyễn Nam Trung</Text>
      <Text style={styles.text}>Mã số sinh viên: 21110333</Text>
      <Text style={styles.text}>Nhóm: 04</Text>
      <Text style={styles.text}>Đề tài: Xây dựng app Discord</Text>
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
