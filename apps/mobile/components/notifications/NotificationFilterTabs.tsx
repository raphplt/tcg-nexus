import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NotificationFilter } from "@/types/notification";

const TABS: { label: string; value: NotificationFilter }[] = [
  { label: "Toutes", value: "all" },
  { label: "Non lues", value: "unread" },
  { label: "Lues", value: "read" },
];

export function NotificationFilterTabs({
  value,
  onChange,
}: {
  value: NotificationFilter;
  onChange: (next: NotificationFilter) => void;
}) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={[styles.button, active && styles.buttonActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: "#f3f4f6",
  },
  buttonActive: { backgroundColor: "#1f2937" },
  text: { color: "#374151", fontSize: 13, fontWeight: "500" },
  textActive: { color: "#ffffff" },
});
