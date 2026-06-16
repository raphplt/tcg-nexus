import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthProvider";

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Bonjour {user?.firstName ?? "Dresseur"}</Text>
        <Text style={styles.subtitle}>
          Gère tes collections et enrichis-les en un scan.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/collection")}
        style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      >
        <View style={[styles.actionIcon, styles.actionIconPrimary]}>
          <Ionicons color={colors.primaryForeground} name="albums" size={22} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>Ma collection</Text>
          <Text style={styles.actionText}>Retrouve et organise tes cartes.</Text>
        </View>
        <Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />
      </Pressable>

      <Pressable
        onPress={() => router.push("/scan")}
        style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      >
        <View style={[styles.actionIcon, styles.actionIconSecondary]}>
          <Ionicons color={colors.secondaryForeground} name="scan" size={22} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>Scanner une carte</Text>
          <Text style={styles.actionText}>Ajoute une carte depuis l'appareil photo.</Text>
        </View>
        <Ionicons color={colors.mutedForeground} name="chevron-forward" size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  actionCardPressed: {
    opacity: 0.85,
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  actionIconPrimary: {
    backgroundColor: colors.primary,
  },
  actionIconSecondary: {
    backgroundColor: colors.secondary,
  },
  actionText: {
    color: colors.mutedForeground,
    fontSize: 13,
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
    gap: 14,
    padding: 20,
  },
  heroCard: {
    backgroundColor: colors.heroDark,
    borderRadius: radius.xl,
    padding: 24,
  },
  subtitle: {
    color: colors.heroDarkMutedForeground,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    color: colors.heroDarkForeground,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
});
