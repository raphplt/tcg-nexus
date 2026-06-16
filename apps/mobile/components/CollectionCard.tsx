import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import type { UserCollection } from "@/types";

interface CollectionCardProps {
  collection: UserCollection;
  onDelete?: (collection: UserCollection) => void;
  onPress: (collection: UserCollection) => void;
}

const resolveCoverImage = (collection: UserCollection): string | undefined => {
  const cover = collection.items?.find((item) => item.pokemonCard?.image)?.pokemonCard?.image;
  if (!cover) {
    return undefined;
  }

  if (/^https?:\/\//i.test(cover)) {
    return cover;
  }

  const r2Base = process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!r2Base) {
    return cover;
  }

  return `${r2Base.replace(/\/$/, "")}/${cover.replace(/^\//, "")}`;
};

const getTotalCards = (collection: UserCollection): number =>
  (collection.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

export function CollectionCard({ collection, onDelete, onPress }: CollectionCardProps) {
  const coverImage = resolveCoverImage(collection);
  const totalCards = getTotalCards(collection);

  return (
    <Pressable
      onPress={() => onPress(collection)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.coverContainer}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons color={colors.mutedForeground} name="albums-outline" size={28} />
            <Text style={styles.coverPlaceholderText}>Pas encore de carte</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>
          {collection.name}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {collection.description || "Collection personnelle"}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{totalCards} cartes</Text>
          <Text style={styles.metaText}>
            {collection.isPublic ? "Publique" : "Privee"}
          </Text>
        </View>
      </View>

      {onDelete ? (
        <Pressable
          onPress={() => onDelete(collection)}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
        >
          <Ionicons color={colors.destructiveForeground} name="trash-outline" size={14} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
  },
  cardPressed: {
    opacity: 0.86,
  },
  content: {
    gap: 6,
    padding: 12,
  },
  coverContainer: {
    backgroundColor: colors.inputBg,
    height: 120,
    width: "100%",
  },
  coverImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  coverPlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  coverPlaceholderText: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 6,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.destructive,
    borderRadius: radius.md,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 24,
  },
  deleteButtonPressed: {
    opacity: 0.75,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 34,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "700",
  },
  name: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
});
