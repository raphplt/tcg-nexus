import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthProvider";
import { API_URL } from "@/services/api";

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>MOBILE FOUNDATION</Text>
        <Text style={styles.title}>Bienvenue {user?.firstName ?? "Dresseur"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f7f1e8",
    flex: 1,
    gap: 16,
    padding: 20,
  },
  eyebrow: {
    color: "#d95f4d",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroCard: {
    backgroundColor: "#15233b",
    borderRadius: 28,
    padding: 24,
  },
  infoCard: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  infoLabel: {
    color: "#7c6a58",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  infoValue: {
    color: "#15233b",
    fontSize: 16,
    lineHeight: 24,
  },
  subtitle: {
    color: "#e5e9f1",
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    color: "#fff8f3",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
  },
});
