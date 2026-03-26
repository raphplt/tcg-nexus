import { StyleSheet, Text, View } from "react-native";

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ma Collection</Text>
      <Text style={styles.subtitle}>
        Vos cartes apparaîtront ici
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
