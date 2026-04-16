import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "@/store/useToastStore";

const COLORS = {
  error: {
    background: "#7a1f1f",
    border: "#d96b5f",
  },
  info: {
    background: "#18324a",
    border: "#5e98d1",
  },
  success: {
    background: "#184a38",
    border: "#66c39a",
  },
} as const;

export function ApiErrorSnackbar() {
  const insets = useSafeAreaInsets();
  const { duration, hideToast, id, message, variant, visible } = useToastStore();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          damping: 18,
          stiffness: 170,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      timeout = setTimeout(() => {
        hideToast();
      }, duration);
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          duration: 150,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: 150,
          toValue: -24,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [duration, hideToast, id, opacity, translateY, visible]);

  const palette = useMemo(() => COLORS[variant], [variant]);

  if (!message) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.wrapper,
          {
            opacity,
            paddingTop: insets.top + 12,
            transform: [{ translateY }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={hideToast}
          style={[
            styles.snackbar,
            {
              backgroundColor: palette.background,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={styles.label}>API</Text>
          <Text style={styles.message}>{message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#f9dbc8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  message: {
    color: "#fff7f2",
    fontSize: 14,
    lineHeight: 20,
  },
  snackbar: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    maxWidth: 540,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    width: "100%",
  },
  wrapper: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
