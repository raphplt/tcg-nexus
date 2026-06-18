import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthProvider";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { deckService } from "@/services/deck.service";
import { tournamentService } from "@/services/tournament.service";
import type { Deck, PokemonSetType, Tournament, UserCollection } from "@/types";
import { getCardImage, getSetIconUrl } from "@/utils/images";

const getTotalCards = (collection: UserCollection): number =>
  (collection.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

const formatShortDate = (value: string): string =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [myDecksCount, setMyDecksCount] = useState(0);
  const [trendingDecks, setTrendingDecks] = useState<Deck[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [newSets, setNewSets] = useState<PokemonSetType[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    const [collectionsRes, myDecksRes, trendingRes, tournamentsRes, setsRes] =
      await Promise.allSettled([
        collectionService.getMyCollections(),
        deckService.getUserDecksPaginated({ page: 1, limit: 1 }),
        deckService.getPaginated({
          page: 1,
          limit: 6,
          sortBy: "views",
          sortOrder: "DESC",
        }),
        tournamentService.getUpcomingTournaments(5),
        cardService.getAllSets(),
      ]);

    if (collectionsRes.status === "fulfilled")
      setCollections(collectionsRes.value);
    if (myDecksRes.status === "fulfilled")
      setMyDecksCount(myDecksRes.value.meta?.totalItems ?? 0);
    if (trendingRes.status === "fulfilled")
      setTrendingDecks(trendingRes.value.data || []);
    if (tournamentsRes.status === "fulfilled")
      setTournaments(tournamentsRes.value);
    if (setsRes.status === "fulfilled") {
      const sorted = [...setsRes.value].sort((a, b) =>
        (b.releaseDate || "").localeCompare(a.releaseDate || ""),
      );
      setNewSets(sorted.slice(0, 8));
    }
  }, []);

  useEffect(() => {
    void loadFeed().finally(() => setIsLoading(false));
  }, [loadFeed]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadFeed().finally(() => setIsRefreshing(false));
  }, [loadFeed]);

  const totalCards = collections.reduce(
    (sum, collection) => sum + getTotalCards(collection),
    0,
  );

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12 },
      ]}
      refreshControl={
        <RefreshControl
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.container}
    >
      {/* En-tête personnalisée */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>BONJOUR</Text>
          <Text style={styles.greeting}>{user?.firstName ?? "Dresseur"} 👋</Text>
        </View>
        <Pressable
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{initials || "?"}</Text>
        </Pressable>
      </View>

      {/* Carte promo / scan */}
      <View style={styles.heroCard}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroTitle}>Complète ta collection</Text>
          <Text style={styles.heroSubtitle}>
            Scanne une carte pour l'ajouter en un instant.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/scan")}
          style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.primary} name="scan" size={18} />
          <Text style={styles.heroButtonText}>Scanner</Text>
        </Pressable>
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCards}</Text>
          <Text style={styles.statLabel}>Cartes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{collections.length}</Text>
          <Text style={styles.statLabel}>Collections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{myDecksCount}</Text>
          <Text style={styles.statLabel}>Decks</Text>
        </View>
      </View>

      {isLoading && (
        <ActivityIndicator
          color={colors.primary}
          size="small"
          style={styles.loader}
        />
      )}

      {/* Tournois à venir */}
      {tournaments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tournois à venir</Text>
            <Pressable onPress={() => router.push("/tournaments")}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.horizontalContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {tournaments.map((tournament) => (
              <Pressable
                key={tournament.id}
                onPress={() => router.push(`/tournaments/${tournament.id}`)}
                style={({ pressed }) => [
                  styles.tournamentCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.tournamentIcon}>
                  <Ionicons color={colors.primary} name="trophy" size={18} />
                </View>
                <Text numberOfLines={2} style={styles.tournamentName}>
                  {tournament.name}
                </Text>
                <View style={styles.tournamentMetaRow}>
                  <Ionicons
                    color={colors.mutedForeground}
                    name="calendar-outline"
                    size={12}
                  />
                  <Text style={styles.tournamentMeta}>
                    {formatShortDate(tournament.startDate)}
                  </Text>
                </View>
                {!!tournament.location && (
                  <View style={styles.tournamentMetaRow}>
                    <Ionicons
                      color={colors.mutedForeground}
                      name="location-outline"
                      size={12}
                    />
                    <Text numberOfLines={1} style={styles.tournamentMeta}>
                      {tournament.location}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Decks tendances */}
      {trendingDecks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Decks tendances</Text>
            <Pressable onPress={() => router.push("/collection")}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.horizontalContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {trendingDecks.map((deck) => (
              <Pressable
                key={deck.id}
                onPress={() => {
                  void deckService.incrementView(deck.id);
                  router.push(`/decks/${deck.id}`);
                }}
                style={({ pressed }) => [
                  styles.deckCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.deckCover}>
                  {deck.coverCard?.image ? (
                    <Image
                      resizeMode="cover"
                      source={{ uri: getCardImage(deck.coverCard.image) }}
                      style={styles.deckCoverImage}
                    />
                  ) : (
                    <Ionicons color={colors.primary} name="layers" size={26} />
                  )}
                </View>
                <Text numberOfLines={1} style={styles.deckName}>
                  {deck.name}
                </Text>
                <View style={styles.tournamentMetaRow}>
                  <Ionicons
                    color={colors.mutedForeground}
                    name="eye-outline"
                    size={12}
                  />
                  <Text style={styles.tournamentMeta}>{deck.views || 0} vues</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Nouvelles extensions */}
      {newSets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nouvelles extensions</Text>
            <Pressable onPress={() => router.push("/collection")}>
              <Text style={styles.sectionLink}>Explorer</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.horizontalContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {newSets.map((set) => (
              <Pressable
                key={set.id}
                onPress={() => router.push("/collection")}
                style={({ pressed }) => [
                  styles.setCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.setLogo}>
                  {getSetIconUrl(set) ? (
                    <Image
                      resizeMode="contain"
                      source={{ uri: getSetIconUrl(set) }}
                      style={styles.setLogoImage}
                    />
                  ) : (
                    <Ionicons
                      color={colors.mutedForeground}
                      name="bookmark"
                      size={22}
                    />
                  )}
                </View>
                <Text numberOfLines={1} style={styles.setName}>
                  {set.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "800",
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  deckCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 10,
    width: 140,
  },
  deckCover: {
    alignItems: "center",
    aspectRatio: 1.4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    width: "100%",
  },
  deckCoverImage: {
    height: "100%",
    width: "100%",
  },
  deckName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  greeting: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "800",
  },
  heroButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: colors.heroDark,
    borderRadius: radius.xl,
    gap: 16,
    marginTop: 18,
    padding: 22,
  },
  heroSubtitle: {
    color: colors.heroDarkMutedForeground,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  heroTextBlock: {
    gap: 2,
  },
  heroTitle: {
    color: colors.heroDarkForeground,
    fontSize: 22,
    fontWeight: "800",
  },
  horizontalContent: {
    gap: 12,
    paddingRight: 4,
  },
  loader: {
    marginTop: 28,
  },
  pressed: {
    opacity: 0.85,
  },
  section: {
    marginTop: 26,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  setCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    width: 120,
  },
  setLogo: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginBottom: 8,
    width: "100%",
  },
  setLogoImage: {
    height: "100%",
    width: "100%",
  },
  setName: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 16,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tournamentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 6,
    padding: 14,
    width: 190,
  },
  tournamentIcon: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 36,
    justifyContent: "center",
    marginBottom: 2,
    width: 36,
  },
  tournamentMeta: {
    color: colors.mutedForeground,
    fontSize: 12,
    flexShrink: 1,
  },
  tournamentMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  tournamentName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 36,
  },
});
