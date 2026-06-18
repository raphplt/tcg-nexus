import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthProvider";

export default function ProfileScreen() {
  const { isLoading, logout, user } = useAuth();

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "?"}</Text>
        </View>
        <Text style={styles.title}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {String(user?.role ?? "user").toUpperCase()}
          </Text>
        </View>
      </View>

      <Pressable
        disabled={isLoading}
        onPress={() => {
          void logout();
        }}
        style={({ pressed }) => [
          styles.logoutButton,
          (pressed || isLoading) && styles.logoutButtonPressed,
        ]}
      >
        <Ionicons color={colors.destructive} name="log-out-outline" size={18} />
        <Text style={styles.logoutButtonText}>
          {isLoading ? "Déconnexion..." : "Se déconnecter"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 64,
    justifyContent: "center",
    marginBottom: 14,
    width: 64,
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: 24,
    fontWeight: "800",
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
    gap: 16,
    padding: 20,
  },
  heroCard: {
    backgroundColor: colors.heroDark,
    borderRadius: radius.xl,
    padding: 24,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    color: colors.destructive,
    fontSize: 16,
    fontWeight: "700",
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.heroDarkBorder,
    borderRadius: radius.full,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    color: colors.heroDarkForeground,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.heroDarkMutedForeground,
    fontSize: 15,
  },
  title: {
    color: colors.heroDarkForeground,
    fontSize: 26,
    fontWeight: "800",
  },
});
