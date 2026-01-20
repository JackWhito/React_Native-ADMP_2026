import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Đoàn Nguyễn Nam Trung</Text>
      <Text style={styles.text}>Mã số sinh viên: 21110333</Text>
      <Text style={styles.text}>Nhóm: 04</Text>
      <Text style={styles.text}>Đề tài: Xây dựng app Discord</Text>
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
});
