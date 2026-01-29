import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChatSidebar from "../components/ChatSideBar.js";
import ChatArea from "../components/ChatArea.js";

export default function HomeScreen({ navigation }) {

  const {top} = useSafeAreaInsets();
  return (
    <View style={[styles.container,{paddingTop: top}]}>
      <ChatSidebar />
      <ChatArea />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#020617",
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
