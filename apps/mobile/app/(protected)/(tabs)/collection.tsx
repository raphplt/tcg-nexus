import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>COLLECTION</Text>
        <Text style={styles.title}>Scanner et ajouter rapidement</Text>
        <Text style={styles.subtitle}>
          Lance le scan OCR depuis ce bouton pour reconnaitre une carte,
          choisir une collection cible et l&apos;ajouter automatiquement.
        </Text>
      </View>

      <Pressable
        onPress={() => {
          router.push("/scan");
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons color="#fff8f3" name="scan" size={24} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },
  container: {
    backgroundColor: "#f7f1e8",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  fab: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 28,
    bottom: 24,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    width: 56,
  },
  fabPressed: {
    opacity: 0.8,
  },
  eyebrow: {
    color: "#d95f4d",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  subtitle: {
    color: "#5d6776",
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    color: "#15233b",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
});
