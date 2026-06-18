import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/constants/theme";
import type { UserCollection } from "@/types";
import { getCardImage } from "@/utils/images";

interface CollectionCardProps {
  collection: UserCollection;
  onDelete?: (collection: UserCollection) => void;
  onPress: (collection: UserCollection) => void;
}

const getTotalCards = (collection: UserCollection): number =>
  (collection.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

export function CollectionCard({
  collection,
  onDelete,
  onPress,
}: CollectionCardProps) {
  const totalCards = getTotalCards(collection);
  const isPublic = collection.isPublic === true;
  const previewItems = (collection.items || []).slice(0, 3);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => onPress(collection)}
        style={({ pressed }) => [styles.cardInner, pressed && styles.cardPressed]}
      >
        <View style={styles.preview}>
          {previewItems.length > 0 ? (
            <View style={styles.previewRow}>
              {previewItems.map((item, index) => (
                <Image
                  key={item.id ?? index}
                  resizeMode="contain"
                  source={{ uri: getCardImage(item.pokemonCard?.image, "low") }}
                  style={styles.previewCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.previewRow}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.previewPlaceholder}>
                  <Ionicons
                    color={colors.primary}
                    name="heart-outline"
                    size={16}
                  />
                </View>
              ))}
            </View>
          )}

          <View
            style={[styles.badge, isPublic ? styles.badgePublic : styles.badgePrivate]}
          >
            <Ionicons
              color={isPublic ? colors.primaryForeground : colors.mutedForeground}
              name={isPublic ? "eye" : "lock-closed"}
              size={11}
            />
            <Text
              style={[
                styles.badgeText,
                isPublic ? styles.badgeTextPublic : styles.badgeTextPrivate,
              ]}
            >
              {isPublic ? "Public" : "Privé"}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.name}>
            {collection.name}
          </Text>
          <Text numberOfLines={2} style={styles.description}>
            {collection.description || "Aucune description"}
          </Text>

          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Ionicons
                color={colors.mutedForeground}
                name={isPublic ? "lock-open-outline" : "lock-closed-outline"}
                size={13}
              />
              <Text style={styles.metaText}>{isPublic ? "Public" : "Privé"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons
                color={colors.mutedForeground}
                name="albums-outline"
                size={13}
              />
              <Text style={styles.metaText}>{totalCards} cartes</Text>
            </View>
          </View>

          <View style={styles.viewButton}>
            <Ionicons color={colors.primary} name="eye-outline" size={14} />
            <Text style={styles.viewButtonText}>Voir la collection</Text>
          </View>
        </View>
      </Pressable>

      {onDelete ? (
        <Pressable
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => onDelete(collection)}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
        >
          <Ionicons
            color={colors.destructiveForeground}
            name="trash-outline"
            size={14}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 4,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    top: 10,
  },
  badgePrivate: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  badgePublic: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextPrivate: {
    color: colors.mutedForeground,
  },
  badgeTextPublic: {
    color: colors.primaryForeground,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
  },
  cardInner: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.92,
  },
  content: {
    gap: 8,
    padding: 14,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.destructive,
    borderRadius: radius.md,
    elevation: 2,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 28,
    zIndex: 10,
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
  metaBlock: {
    gap: 4,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  name: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "800",
  },
  preview: {
    alignItems: "center",
    backgroundColor: colors.accent,
    height: 138,
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
  },
  previewCard: {
    borderRadius: 8,
    elevation: 3,
    height: 96,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    width: 70,
  },
  previewPlaceholder: {
    alignItems: "center",
    backgroundColor: "rgba(183,41,33,0.08)",
    borderColor: "rgba(183,41,33,0.35)",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    width: 56,
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  viewButton: {
    alignItems: "center",
    borderColor: "rgba(183,41,33,0.3)",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 2,
    paddingVertical: 10,
  },
  viewButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
