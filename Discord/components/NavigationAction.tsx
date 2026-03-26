import { View, Pressable } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export default function NavigationAction({ onPress }: { onPress: () => void }) {
  return (
    <View>
      <Pressable
        className="h-[48px] w-[48px] rounded-[24px] overflow-hidden items-center justify-center bg-background dark:bg-neutral-700 self-center"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Create server"
      >
        <Ionicons name="add" color="green" size={25} />
      </Pressable>
    </View>
  );
}
