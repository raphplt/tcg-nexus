import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CardDetailModal } from "@/components/CardDetailModal";
import { SelectionModal } from "@/components/SelectionModal";
import { cardService } from "@/services/card.service";
import { toast } from "@/store/useToastStore";
import type {
  CardSearchResult,
  CardsPaginatedResponse,
  PokemonSerieType,
  PokemonSetType,
} from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";
import { getCardImage, getSeriesIconUrl, getSetIconUrl } from "@/utils/images";

const PAGE_SIZE = 24;

const dedupeCards = (cards: CardSearchResult[]): CardSearchResult[] => {
  const seen = new Set<string>();
  const next: CardSearchResult[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    next.push(card);
  }
  return next;
};

export function PokedexView() {
  const [cards, setCards] = useState<CardSearchResult[]>([]);
  const [meta, setMeta] = useState<CardsPaginatedResponse["meta"] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [selectedSerieId, setSelectedSerieId] = useState<string | undefined>(
    undefined,
  );
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>(
    undefined,
  );
  const [selectedRarity, setSelectedRarity] = useState<string | undefined>(
    undefined,
  );

  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [sets, setSets] = useState<PokemonSetType[]>([]);

  const [setRarities, setSetRarities] = useState<
    { id: string; name: string }[]
  >([]);

  const [isSerieModalVisible, setIsSerieModalVisible] = useState(false);
  const [isSetModalVisible, setIsSetModalVisible] = useState(false);
  const [isRarityModalVisible, setIsRarityModalVisible] = useState(false);

  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(
    null,
  );
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [loadedSeries, loadedSets] = await Promise.all([
          cardService.getAllSeries(),
          cardService.getAllSets(),
        ]);
        setSeries(loadedSeries);
        setSets(loadedSets);
      } catch (err) {
        console.error("Failed to load filter metadata:", err);
      }
    };
    void fetchMetadata();
  }, []);

  useEffect(() => {
    const fetchRarities = async () => {
      if (selectedSetId) {
        try {
          const rarities = await cardService.getSetRarities(selectedSetId);
          setSetRarities(rarities.map((r) => ({ id: r, name: r })));
        } catch (err) {
          console.error("Failed to load set rarities:", err);
          setSetRarities([]);
        }
      } else {
        setSetRarities([]);
      }
    };
    void fetchRarities();
  }, [selectedSetId]);

  const loadCards = useCallback(
    async (options?: { loadMore?: boolean; refresh?: boolean }) => {
      // Si on n'a ni recherche, ni set sélectionné, on ne charge pas les cartes
      if (!debouncedSearch && !selectedSetId) {
        setCards([]);
        setMeta(null);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        return;
      }

      const loadMore = options?.loadMore === true;
      const refresh = options?.refresh === true;

      if (loadMore) {
        if (!meta?.hasNextPage || isLoadingMore) return;
        setIsLoadingMore(true);
      } else if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const nextPage = loadMore ? (meta?.currentPage || 1) + 1 : 1;
        const response = await cardService.getPaginated({
          limit: PAGE_SIZE,
          page: nextPage,
          search: debouncedSearch || undefined,
          setId: selectedSetId,
          serieId: selectedSerieId,
          rarity: selectedRarity,
        });

        setMeta(response.meta);
        setCards((prev) =>
          loadMore ? dedupeCards([...prev, ...response.data]) : response.data,
        );
      } catch (error) {
        toast.showError(getApiErrorMessage(error));
      } finally {
        if (loadMore) setIsLoadingMore(false);
        else if (refresh) setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [
      debouncedSearch,
      isLoadingMore,
      meta?.currentPage,
      meta?.hasNextPage,
      selectedSetId,
      selectedSerieId,
      selectedRarity,
    ],
  );

  useEffect(() => {
    void loadCards();
  }, [debouncedSearch, selectedSetId, selectedSerieId, selectedRarity]);

  const handleSelectSerie = (serieId: string | undefined) => {
    setSelectedSerieId(serieId);
    if (serieId) {
      const selectedSet = sets.find((s) => s.id === selectedSetId);
      if (selectedSet && selectedSet.serie?.id !== serieId) {
        setSelectedSetId(undefined);
      }
    }
  };

  const filteredSetsOptions = useMemo(() => {
    if (!selectedSerieId) return sets;
    return sets.filter((s) => s.serie?.id === selectedSerieId);
  }, [sets, selectedSerieId]);

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim().length > 0 ||
      selectedSerieId !== undefined ||
      selectedSetId !== undefined ||
      selectedRarity !== undefined
    );
  }, [search, selectedSerieId, selectedSetId, selectedRarity]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedSerieId(undefined);
    setSelectedSetId(undefined);
    setSelectedRarity(undefined);
  };

  const renderSeriesGrid = () => (
    <View style={styles.gridSection}>
      <Text style={styles.sectionTitle}>Séries Pokémon</Text>
      <View style={styles.gridContainer}>
        {series.map((serie) => (
          <Pressable
            key={serie.id}
            onPress={() => handleSelectSerie(serie.id)}
            style={({ pressed }) => [
              styles.gridItem,
              pressed && styles.gridItemPressed,
            ]}
          >
            <View style={styles.gridItemLogoContainer}>
              {getSeriesIconUrl(serie) ? (
                <Image
                  source={{ uri: getSeriesIconUrl(serie) }}
                  style={styles.gridItemLogo}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.gridItemPlaceholder}>POKÉMON</Text>
              )}
            </View>
            <Text style={styles.gridItemName}>{serie.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderSetsGrid = () => {
    const activeSerie = series.find((s) => s.id === selectedSerieId);
    return (
      <View style={styles.gridSection}>
        <View style={styles.sectionHeaderRow}>
          <Pressable
            onPress={() => handleSelectSerie(undefined)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={16} color="#555555" />
            <Text style={styles.backButtonText}>Retour aux séries</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionTitle}>
          Extensions de {activeSerie?.name || "la série"}
        </Text>
        <View style={styles.setsListContainer}>
          {filteredSetsOptions.map((set) => (
            <Pressable
              key={set.id}
              onPress={() => setSelectedSetId(set.id)}
              style={({ pressed }) => [
                styles.setListItem,
                pressed && styles.gridItemPressed,
              ]}
            >
              <View style={styles.setListLogoContainer}>
                {getSetIconUrl(set) ? (
                  <Image
                    source={{ uri: getSetIconUrl(set) }}
                    style={styles.setListLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="bookmark" size={24} color="#cccccc" />
                )}
              </View>
              <View style={styles.setListInfo}>
                <Text style={styles.setListName}>{set.name}</Text>
                {set.releaseDate && (
                  <Text style={styles.setListDate}>
                    {new Date(set.releaseDate).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "short",
                    })}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.eyebrow}>EXPLORATEUR</Text>
      <Text style={styles.title}>Pokédex</Text>
      <Text style={styles.subtitle}>
        Parcourez toutes les cartes Pokémon officielles
      </Text>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons color="#555555" name="search" size={16} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Rechercher un Pokémon..."
            placeholderTextColor="#888888"
            style={styles.searchInput}
            value={search}
          />
          {search.length > 0 && (
            <Pressable hitSlop={10} onPress={() => setSearch("")}>
              <Ionicons color="#555555" name="close-circle" size={16} />
            </Pressable>
          )}
        </View>

        {(selectedSetId || debouncedSearch.length > 0) && (
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={({ pressed }) => [
              styles.filterToggleButton,
              showFilters && styles.filterToggleButtonActive,
              pressed && styles.filterToggleButtonPressed,
            ]}
          >
            <Ionicons
              color={showFilters ? "#ffffff" : "#0b0b0b"}
              name="options"
              size={18}
            />
          </Pressable>
        )}
      </View>
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setIsRarityModalVisible(true)}
              style={({ pressed }) => [
                styles.filterPill,
                selectedRarity && styles.filterPillActive,
                pressed && styles.filterPillPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedRarity && styles.filterPillTextActive,
                ]}
              >
                {selectedRarity
                  ? setRarities.find((r) => r.id === selectedRarity)?.name ||
                    "Rareté"
                  : "Rareté"}
              </Text>
              <Ionicons
                color={selectedRarity ? "#b72921" : "#555555"}
                name="chevron-down"
                size={12}
              />
            </Pressable>
          </View>

          {hasActiveFilters && (
            <Pressable
              onPress={handleResetFilters}
              style={styles.resetFiltersBtn}
            >
              <Ionicons color="#555555" name="refresh" size={14} />
              <Text style={styles.resetFiltersText}>
                Réinitialiser les filtres
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!debouncedSearch &&
        !selectedSerieId &&
        !selectedSetId &&
        renderSeriesGrid()}
      {!debouncedSearch &&
        selectedSerieId &&
        !selectedSetId &&
        renderSetsGrid()}
      {!debouncedSearch && selectedSetId && (
        <View style={styles.gridSection}>
          <View style={styles.sectionHeaderRow}>
            <Pressable
              onPress={() => {
                setSelectedSetId(undefined);
                setShowFilters(false);
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color="#555555" />
              <Text style={styles.backButtonText}>Retour aux extensions</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>
            Cartes de{" "}
            {sets.find((s) => s.id === selectedSetId)?.name || "l'extension"}
          </Text>
        </View>
      )}
    </View>
  );

  const renderCardCell = ({ item }: { item: CardSearchResult }) => {
    const isSpecialCard = item.rarity?.toLowerCase().includes("illustration");

    return (
      <View style={styles.cardCell}>
        <Pressable
          onPress={() => {
            setSelectedCard(item);
            setIsCardModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.cardPressable,
            pressed && styles.cardPressablePressed,
          ]}
        >
          <View style={styles.imageContainer}>
            {item.image ? (
              <Image
                resizeMode="contain"
                source={{ uri: getCardImage(item.image) }}
                style={styles.cardImage}
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Ionicons color="#e4e4e4" name="image-outline" size={24} />
              </View>
            )}

            {isSpecialCard && (
              <View style={styles.sparkleBadge}>
                <Ionicons color="#ffffff" name="sparkles" size={10} />
              </View>
            )}
          </View>

          <View style={styles.cardInfo}>
            <Text numberOfLines={1} style={styles.cardName}>
              {item.name}
            </Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardSetCode}>
                {item.set?.name || "Inconnu"}
              </Text>
              <Text style={styles.cardNumber}>#{item.localId}</Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.rowWrapper}
        data={cards}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={2}
        ListEmptyComponent={
          !isLoading && (debouncedSearch || selectedSetId) ? (
            <View style={styles.emptyState}>
              <Ionicons color="#cccccc" name="search-outline" size={48} />
              <Text style={styles.emptyTitle}>Aucune carte trouvée</Text>
              <Text style={styles.emptyText}>
                Modifiez vos filtres ou essayez une autre recherche.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore || isLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#0b0b0b" size="small" />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (!isLoadingMore && !isLoading && meta?.hasNextPage) {
            void loadCards({ loadMore: true });
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadCards({ refresh: true })}
            refreshing={isRefreshing}
            tintColor="#0b0b0b"
          />
        }
        renderItem={renderCardCell}
      />

      <CardDetailModal
        card={selectedCard}
        isVisible={isCardModalVisible}
        onClose={() => setIsCardModalVisible(false)}
      />

      <SelectionModal
        isVisible={isSerieModalVisible}
        onClose={() => setIsSerieModalVisible(false)}
        title="Série"
        options={series.map((s) => ({ id: s.id, name: s.name }))}
        selectedValue={selectedSerieId}
        onSelect={handleSelectSerie}
        placeholder="Rechercher une série..."
      />

      <SelectionModal
        isVisible={isSetModalVisible}
        onClose={() => setIsSetModalVisible(false)}
        title="Extension"
        options={filteredSetsOptions.map((s) => ({ id: s.id, name: s.name }))}
        selectedValue={selectedSetId}
        onSelect={setSelectedSetId}
        placeholder="Rechercher un set..."
      />

      <SelectionModal
        isVisible={isRarityModalVisible}
        onClose={() => setIsRarityModalVisible(false)}
        title="Rareté"
        options={setRarities}
        selectedValue={selectedRarity}
        onSelect={setSelectedRarity}
        placeholder="Rechercher une rareté..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardCell: {
    flex: 1,
    maxWidth: "48.5%",
    marginBottom: 10,
  },
  cardImage: {
    height: "100%",
    width: "100%",
  },
  cardImagePlaceholder: {
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  cardInfo: {
    padding: 8,
  },
  cardMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  cardName: {
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "700",
  },
  cardNumber: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "700",
  },
  cardPressable: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardPressablePressed: {
    opacity: 0.8,
  },
  cardSetCode: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
    marginRight: 4,
  },
  container: {
    backgroundColor: "#fcfcfc",
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  emptyText: {
    color: "#555555",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
  },
  eyebrow: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: "#fdf2f2",
    borderColor: "#f0d4d4",
  },
  filterPillPressed: {
    opacity: 0.7,
  },
  filterPillText: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#b72921",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterToggleButton: {
    alignItems: "center",
    backgroundColor: "#e4e4e4",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  filterToggleButtonActive: {
    backgroundColor: "#0b0b0b",
  },
  filterToggleButtonPressed: {
    opacity: 0.7,
  },
  filtersContainer: {
    marginTop: 12,
  },
  footerLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  headerBlock: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  imageContainer: {
    aspectRatio: 0.71,
    backgroundColor: "#f5f5f5",
    width: "100%",
  },
  listContent: {
    paddingBottom: 40,
  },
  resetFiltersBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    padding: 4,
  },
  resetFiltersText: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "600",
  },
  rowWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  searchInput: {
    color: "#0b0b0b",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  searchInputContainer: {
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  sparkleBadge: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 20,
  },
  subtitle: {
    color: "#555555",
    fontSize: 14,
    marginTop: 4,
  },
  title: {
    color: "#0b0b0b",
    fontSize: 28,
    fontWeight: "800",
  },
  gridSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0b0b0b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: "31%", // ~ 3 par ligne
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e4e4",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
  },
  gridItemPressed: {
    opacity: 0.7,
  },
  gridItemLogoContainer: {
    height: 48,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  gridItemLogo: {
    width: "100%",
    height: "100%",
  },
  gridItemPlaceholder: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#cccccc",
  },
  gridItemName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0b0b0b",
    textAlign: "center",
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  backButtonText: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "600",
  },
  setsListContainer: {
    gap: 8,
  },
  setListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e4e4",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  setListLogoContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  setListLogo: {
    width: 24,
    height: 24,
  },
  setListInfo: {
    flex: 1,
  },
  setListName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0b0b0b",
  },
  setListDate: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
});
