import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingScreenProps {
  description?: string;
  title?: string;
}

export function LoadingScreen({
  description = "Restauration de la session et connexion securisee a l'API.",
  title = "TCG Nexus",
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.orb, styles.orbPrimary]} />
      <View style={[styles.orb, styles.orbSecondary]} />

      <View style={styles.card}>
        <Text style={styles.eyebrow}>MOBILE AUTH</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <ActivityIndicator color="#d95f4d" size="large" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(20,35,59,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    elevation: 6,
    maxWidth: 380,
    paddingHorizontal: 28,
    paddingVertical: 32,
    shadowColor: "#15233b",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    width: "100%",
  },
  container: {
    alignItems: "center",
    backgroundColor: "#f7f1e8",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
  },
  description: {
    color: "#5b6576",
    fontSize: 15,
    lineHeight: 22,
  },
  eyebrow: {
    color: "#d95f4d",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  loader: {
    marginTop: 24,
  },
  orb: {
    borderRadius: 999,
    position: "absolute",
  },
  orbPrimary: {
    backgroundColor: "rgba(217,95,77,0.16)",
    height: 220,
    right: -40,
    top: 80,
    width: 220,
  },
  orbSecondary: {
    backgroundColor: "rgba(21,35,59,0.08)",
    bottom: 120,
    height: 180,
    left: -50,
    width: 180,
  },
  title: {
    color: "#15233b",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
  },
});
