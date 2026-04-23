import React from "react";
import { Image, View } from "react-native";

export default function AppBootstrapSplash() {
  return (
    <View className="absolute inset-0 items-center justify-center bg-[#0D0D0F]">
      <Image
        source={require("@/assets/images/discord-logo.png")}
        style={{ width: 220, height: 220 }}
        resizeMode="contain"
      />
    </View>
  );
}
