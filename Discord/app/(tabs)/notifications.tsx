import { View, Text } from "react-native";
import React from "react";

export default function NotificationsTab() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-4">
      <Text className="text-foreground text-lg font-semibold">Notifications</Text>
      <Text className="text-muted-foreground text-sm mt-2 text-center">
        No notifications yet.
      </Text>
    </View>
  );
}
