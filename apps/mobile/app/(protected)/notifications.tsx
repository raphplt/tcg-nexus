import { Stack, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyNotifications } from "@/components/notifications/EmptyNotifications";
import { NotificationFilterTabs } from "@/components/notifications/NotificationFilterTabs";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationFilter } from "@/types/notification";
import { resolveDeepLink } from "@/utils/notification-link";

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const {
    items,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    page,
    totalPages,
  } = useNotifications(filter);

  const handleItemPress = async (id: number, link?: string) => {
    await markAsRead(id);
    const target = resolveDeepLink(link ?? null);
    if (target) {
      router.push(target as any);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () => (
            <Pressable onPress={() => void markAllAsRead()} hitSlop={10}>
              <Text style={styles.headerAction}>Tout lu</Text>
            </Pressable>
          ),
        }}
      />
      <NotificationFilterTabs value={filter} onChange={setFilter} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Erreur de chargement</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
          onScrollEndDrag={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              e.nativeEvent;
            const isNearBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 80;
            if (isNearBottom && page < totalPages) {
              void loadMore();
            }
          }}
        >
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onPress={() =>
                void handleItemPress(notification.id, notification.data?.link)
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  list: { paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#dc2626" },
  headerAction: { color: "#1f2937", fontWeight: "600", paddingHorizontal: 12 },
});
