import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { useToastStore } from "@/store/useToastStore";

const VARIANTS = {
  error: {
    background: colors.destructive,
    label: "Erreur",
  },
  info: {
    background: colors.secondary,
    label: "Info",
  },
  success: {
    background: colors.success,
    label: "Succès",
  },
} as const;

export function ApiErrorSnackbar() {
  const insets = useSafeAreaInsets();
  const { duration, hideToast, id, message, variant, visible } =
    useToastStore();

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

  const palette = useMemo(() => VARIANTS[variant], [variant]);

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
            },
          ]}
        >
          <Text style={styles.label}>{palette.label}</Text>
          <Text style={styles.message}>{message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  message: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
  snackbar: {
    borderRadius: 12,
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
