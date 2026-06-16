import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";

export default function MarketplaceScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons color={colors.primary} name="cart-outline" size={28} />
        </View>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>
          Bientôt disponible : achète, vends et échange tes cartes en toute simplicité.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 28,
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "800",
  },
});
