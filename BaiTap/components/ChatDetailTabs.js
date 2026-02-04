// components/ChatDetailTabs.jsx
import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { useRef, useEffect } from "react";

const tabs = [
  { key: "participants", label: "Participants" },
  { key: "media", label: "Media" },
  { key: "pinned", label: "Pinned" },
  { key: "files", label: "Files" },
  { key: "links", label: "Links" },
];

export default function ChatDetailTabs({ activeTab, onChange }) {
  const scrollRef = useRef(null);
  const tabLayouts = useRef({}).current;

  useEffect(() => {
    const layout = tabLayouts[activeTab];
    if (!layout || !scrollRef.current) return;

    scrollRef.current.scrollTo({
      x: Math.max(layout.x - 60, 0),
      animated: true,
    });
  }, [activeTab]);

  return (
    <View className="border-b border-zinc-800">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            onLayout={e => {
              tabLayouts[tab.key] = e.nativeEvent.layout;
            }}
            className="px-4 py-3 items-center"
          >
            <Text
              className={`text-base font-medium ${
                activeTab === tab.key
                  ? "text-blue-500"
                  : "text-zinc-400"
              }`}
            >
              {tab.label}
            </Text>

            {activeTab === tab.key && (
              <View className="mt-2 h-[2px] w-6 bg-blue-500 rounded-full" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
