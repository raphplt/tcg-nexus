import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

export function EmptyNotifications() {
  return (
    <View style={styles.container}>
      <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
      <Text style={styles.text}>Aucune notification pour le moment</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  text: { color: "#6b7280", fontSize: 16, textAlign: "center" },
});
