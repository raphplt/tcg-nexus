import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import type { CardSearchResult } from "@/types";
import { getCardImage } from "@/utils/images";

interface CardRowProps {
  card: CardSearchResult;
  selected: boolean;
  onSelect: (card: CardSearchResult) => void;
}

// ligne de résultat sélectionnable (candidats + recherche manuelle)
export function CardRow({ card, selected, onSelect }: CardRowProps) {
  const thumb = getCardImage(card.image, "low");

  return (
    <Pressable
      onPress={() => onSelect(card)}
      style={({ pressed }) => [
        styles.resultRow,
        selected && styles.resultRowSelected,
        pressed && styles.resultRowPressed,
      ]}
    >
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.rowThumb} />
      ) : (
        <View style={[styles.rowThumb, styles.rowThumbEmpty]} />
      )}
      <View style={styles.resultText}>
        <Text numberOfLines={1} style={styles.resultTitle}>
          {card.name || "Carte sans nom"}
        </Text>
        <Text style={styles.resultMeta}>
          {card.localId ? `#${card.localId}` : "-"}
          {card.set?.name ? ` • ${card.set.name}` : ""}
        </Text>
      </View>
      {selected ? (
        <Ionicons color={colors.secondary} name="checkmark-circle" size={22} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  resultRow: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resultRowPressed: {
    opacity: 0.85,
  },
  resultRowSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.secondary,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  resultMeta: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  rowThumb: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    height: 66,
    width: 47,
  },
  rowThumbEmpty: {
    borderColor: "#d0d0d0",
    borderWidth: 1,
  },
});
