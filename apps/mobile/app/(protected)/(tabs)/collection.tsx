import { StyleSheet, Text, View } from "react-native";

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>COLLECTION</Text>
        <Text style={styles.title}>Zone protegee</Text>
        <Text style={styles.subtitle}>
          Cet ecran ne devient accessible qu&apos;avec une session valide.
          L&apos;auth guard du groupe `(protected)` empeche l&apos;acces anonyme.
        </Text>
      </View>
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
