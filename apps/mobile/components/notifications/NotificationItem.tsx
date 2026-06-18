import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NotificationItem as NotificationItemType } from "@/types/notification";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TYPE_TO_ICON: Record<string, IconName> = {
  "follow.created": "person-add-outline",
  "follow.removed": "person-remove-outline",
  "tournament.started": "trophy-outline",
  "tournament.finished": "trophy",
  "tournament.match_reminder": "alarm-outline",
  "match.ready": "play-circle-outline",
  "badge.unlocked": "ribbon-outline",
  "marketplace.sale": "cart-outline",
  "order.shipped": "cube-outline",
};

export function NotificationItem({
  notification,
  onPress,
}: {
  notification: NotificationItemType;
  onPress: () => void;
}) {
  const icon = TYPE_TO_ICON[notification.type] ?? "notifications-outline";
  const when = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !notification.isRead && styles.unread]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color="#1f2937" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.text} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.time}>{when}</Text>
      </View>
      {!notification.isRead && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    alignItems: "center",
  },
  unread: { backgroundColor: "rgba(99,102,241,0.06)" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  title: { fontWeight: "600", color: "#111827", fontSize: 15 },
  text: { color: "#374151", fontSize: 13 },
  time: { color: "#9ca3af", fontSize: 11, marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
});
