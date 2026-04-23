import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import { ChatDetailContent, type ChatDetailTarget } from "@/components/ChatDetailContent";

export default function ChatDetailModal({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target: ChatDetailTarget | null;
  onClose: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const translateX = useSharedValue(screenW);
  const panOriginX = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  const closeAnimated = useCallback(() => {
    translateX.value = withTiming(screenW, { duration: 260 }, (done) => {
      if (done) {
        runOnJS(setMounted)(false);
        runOnJS(onClose)();
      }
    });
  }, [translateX, screenW, onClose]);

  useEffect(() => {
    return () => {
      cancelAnimation(translateX);
    };
  }, [translateX]);

  useEffect(() => {
    if (visible && target) {
      setMounted(true);
      translateX.value = screenW;
      translateX.value = withTiming(0, { duration: 300 });
    }
  }, [visible, target, screenW, translateX]);

  useEffect(() => {
    if (!mounted) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeAnimated();
      return true;
    });
    return () => sub.remove();
  }, [mounted, closeAnimated]);

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  /** Swipe left → right: drag sheet off-screen to the right, then dismiss. */
  const panClose = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(16)
        .failOffsetY([-20, 20])
        .onBegin(() => {
          cancelAnimation(translateX);
          panOriginX.value = translateX.value;
        })
        .onUpdate((e) => {
          const next = panOriginX.value + e.translationX;
          translateX.value = Math.min(Math.max(0, next), screenW);
        })
        .onEnd((e) => {
          const threshold = screenW * 0.22;
          if (translateX.value > threshold || e.velocityX > 520) {
            runOnJS(closeAnimated)();
          } else {
            translateX.value = withTiming(0, { duration: 220 });
          }
        }),
    [closeAnimated, screenW, translateX, panOriginX]
  );

  if (!mounted || !target) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeAnimated}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-1">
            <Pressable
              className="absolute inset-0 bg-black/45"
              onPress={closeAnimated}
              accessibilityLabel="Dismiss chat"
            />
            <GestureDetector gesture={panClose}>
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: screenW,
                  },
                  animatedSheet,
                ]}
                className="bg-zinc-900 border-l border-zinc-800"
              >
                <SafeAreaView edges={["top", "bottom"]} className="flex-1">
                  <ChatDetailContent
                    target={target}
                    onClose={closeAnimated}
                    closeIcon="chevron-back"
                  />
                </SafeAreaView>
              </Animated.View>
            </GestureDetector>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
