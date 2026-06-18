import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import type { CardSearchResult, ScanParsedFields } from "@/types";
import { getCardImage } from "@/utils/images";

interface CompareSectionProps {
  photoUri: string | null;
  selectedCard: CardSearchResult | null;
  parsed: ScanParsedFields | null;
}

export function CompareSection({
  photoUri,
  selectedCard,
  parsed,
}: CompareSectionProps) {
  const matchImage = getCardImage(selectedCard?.image, "high");

  return (
    <View style={styles.compareCard}>
      <Text style={styles.sectionTitle}>Vérification</Text>
      <View style={styles.compareRow}>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Ta photo</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.scanPreview} />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>Image indisponible</Text>
            </View>
          )}
        </View>

        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Carte trouvée</Text>
          {matchImage ? (
            <Image source={{ uri: matchImage }} style={styles.scanPreview} />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderText}>
                Aucune carte correspondante
              </Text>
            </View>
          )}
        </View>
      </View>

      {parsed?.cardName ? (
        <Text style={styles.ocrMeta}>
          Carte lue : {parsed.cardName}
          {parsed?.setName ? ` • ${parsed.setName}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compareCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  compareRow: {
    flexDirection: "row",
    gap: 12,
  },
  compareColumn: {
    flex: 1,
    gap: 8,
  },
  compareLabel: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  scanPreview: {
    borderRadius: radius.lg,
    height: 160,
    resizeMode: "cover",
    width: "100%",
  },
  placeholderBox: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 160,
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.mutedForeground,
    fontSize: 13,
    textAlign: "center",
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  ocrMeta: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 8,
  },
});
