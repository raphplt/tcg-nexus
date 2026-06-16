import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";

interface LoadingScreenProps {
  description?: string;
  title?: string;
}

export function LoadingScreen({
  description = "Chargement en cours...",
  title = "TCG Nexus",
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    maxWidth: 380,
    paddingHorizontal: 28,
    paddingVertical: 32,
    width: "100%",
  },
  container: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  loader: {
    marginTop: 24,
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
});
