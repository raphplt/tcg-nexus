import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { notificationService } from "@/services/notification.service";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const response = await notificationService.getNotifications({
          page: 1,
          limit: 1,
          filter: "unread",
        });
        if (!cancelled) setCount(response.unreadCount);
      } catch {}
    };
    void fetchCount();
    const timer = setInterval(fetchCount, POLL_INTERVAL_MS);
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active") void fetchCount();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      appStateSub.remove();
    };
  }, []);

  const display = count > 99 ? "99+" : String(count);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      onPress={() => router.push("/(protected)/notifications" as any)}
      style={styles.wrapper}
      hitSlop={10}
    >
      <Ionicons
        name="notifications-outline"
        size={26}
        color={colors.heroDarkForeground}
      />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{display}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#e11d48",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
