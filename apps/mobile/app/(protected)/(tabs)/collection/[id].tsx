import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { toast } from "@/store/useToastStore";
import type {
  CardSearchResult,
  CollectionItem,
  CollectionItemsPaginatedResponse,
  UserCollection,
  PokemonSerieType,
  PokemonSetType,
} from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";
import { AddCardModal } from "@/components/AddCardModal";
import { CardDetailModal } from "@/components/CardDetailModal";
import { SelectionModal } from "@/components/SelectionModal";
import { getCardImage } from "@/utils/images";

const cardStates = [
  { label: "Near Mint", value: "NM" },
  { label: "Excellent", value: "EX" },
  { label: "Good", value: "GD" },
  { label: "Lightly Played", value: "LP" },
  { label: "Played", value: "PL" },
  { label: "Poor", value: "Poor" },
];

const PAGE_SIZE = 24;

const resolveImage = (image?: string): string | undefined => {
  if (!image) {
    return undefined;
  }

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const r2Base = process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!r2Base) {
    return image;
  }

  return `${r2Base.replace(/\/$/, "")}/${image.replace(/^\//, "")}`;
};

const sortOptions: Array<{
  label: string;
  value: "added_at" | "pokemonCard.name" | "pokemonCard.rarity" | "quantity";
}> = [
  { label: "Date d'ajout", value: "added_at" },
  { label: "Nom", value: "pokemonCard.name" },
  { label: "Rareté", value: "pokemonCard.rarity" },
  { label: "Quantité", value: "quantity" },
];

const dedupeItems = (items: CollectionItem[]): CollectionItem[] => {
  const seen = new Set<string>();
  const next: CollectionItem[] = [];

  for (const item of items) {
    const key = item.id ? `item-${item.id}` : `card-${item.pokemonCard?.id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(item);
  }

  return next;
};

export default function CollectionDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [collection, setCollection] = useState<UserCollection | null>(null);
  const isMasterSet = useMemo(() => {
    return collection?.masterSet != null;
  }, [collection?.masterSet]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [meta, setMeta] = useState<
    CollectionItemsPaginatedResponse["meta"] | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeletingItemId, setIsDeletingItemId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "added_at" | "pokemonCard.name" | "pokemonCard.rarity" | "quantity"
  >("added_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

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
  const [selectedCardState, setSelectedCardState] = useState<
    string | undefined
  >(undefined);

  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [setRarities, setSetRarities] = useState<
    { id: string; name: string }[]
  >([]);

  const [isSerieModalVisible, setIsSerieModalVisible] = useState(false);
  const [isSetModalVisible, setIsSetModalVisible] = useState(false);
  const [isRarityModalVisible, setIsRarityModalVisible] = useState(false);
  const [isStateModalVisible, setIsStateModalVisible] = useState(false);
  const [isSortByModalVisible, setIsSortByModalVisible] = useState(false);

  const getSortByLabel = (value: typeof sortBy) => {
    switch (value) {
      case "added_at":
        return "Date d'ajout";
      case "pokemonCard.name":
        return "Nom";
      case "pokemonCard.rarity":
        return "Rareté";
      case "quantity":
        return "Quantité";
      default:
        return "";
    }
  };

  const handleSelectSortBy = () => {
    setIsSortByModalVisible(true);
  };

  const handleSelectSortOrder = () => {
    setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
  };

  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(
    null,
  );
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

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

        if (collectionId) {
          const rarities =
            await collectionService.getCollectionRarities(collectionId);
          setSetRarities(rarities.map((r) => ({ id: r, name: r })));
        }
      } catch (err) {
        console.error("Failed to load filter metadata:", err);
      }
    };
    void fetchMetadata();
  }, [collectionId]);

  const loadCollectionHeader = useCallback(async () => {
    if (!collectionId) {
      return;
    }

    const data = await collectionService.getCollectionById(collectionId);
    setCollection(data);
  }, [collectionId]);

  const loadItems = useCallback(
    async (options?: { loadMore?: boolean; refresh?: boolean }) => {
      if (!collectionId) {
        return;
      }

      const loadMore = options?.loadMore === true;
      const refresh = options?.refresh === true;

      if (loadMore) {
        if (!meta?.hasNextPage || isLoadingMore) {
          return;
        }
        setIsLoadingMore(true);
      } else if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const nextPage = loadMore ? (meta?.currentPage || 1) + 1 : 1;
        const response = await collectionService.getCollectionItems(
          collectionId,
          {
            limit: PAGE_SIZE,
            page: nextPage,
            search: debouncedSearch || undefined,
            sortBy,
            sortOrder,
            setId: selectedSetId,
            serieId: selectedSerieId,
            rarity: selectedRarity,
            cardState: selectedCardState,
          },
        );

        setMeta(response.meta);
        setItems((prev) =>
          loadMore ? dedupeItems([...prev, ...response.data]) : response.data,
        );
      } catch (error) {
        toast.showError(getApiErrorMessage(error));
      } finally {
        if (loadMore) {
          setIsLoadingMore(false);
        } else if (refresh) {
          setIsRefreshing(false);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [
      collectionId,
      debouncedSearch,
      isLoadingMore,
      meta?.currentPage,
      meta?.hasNextPage,
      sortBy,
      sortOrder,
      selectedSetId,
      selectedSerieId,
      selectedRarity,
      selectedCardState,
    ],
  );

  useEffect(() => {
    if (!collectionId) {
      return;
    }

    void Promise.all([loadCollectionHeader(), loadItems()]);
  }, [collectionId]);

  useEffect(() => {
    if (!collectionId) {
      return;
    }

    void loadItems();
  }, [
    debouncedSearch,
    sortBy,
    sortOrder,
    selectedSetId,
    selectedSerieId,
    selectedRarity,
    selectedCardState,
  ]);

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
    if (!selectedSerieId) {
      return sets;
    }
    return sets.filter((s) => s.serie?.id === selectedSerieId);
  }, [sets, selectedSerieId]);

  const hasActiveFilters = useMemo(() => {
    if (isMasterSet) {
      return search.trim().length > 0 || selectedRarity !== undefined;
    }
    return (
      search.trim().length > 0 ||
      selectedSerieId !== undefined ||
      selectedSetId !== undefined ||
      selectedRarity !== undefined ||
      selectedCardState !== undefined
    );
  }, [
    isMasterSet,
    search,
    selectedSerieId,
    selectedSetId,
    selectedRarity,
    selectedCardState,
  ]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedSerieId(undefined);
    setSelectedSetId(undefined);
    setSelectedRarity(undefined);
    setSelectedCardState(undefined);
  };

  const stats = useMemo(() => {
    const totalCards = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const bySet = new Map<string, number>();
    const byRarity = new Map<string, number>();

    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const setName = item.pokemonCard?.set?.name || "Inconnu";
      const rarity = item.pokemonCard?.rarity || "Inconnue";

      bySet.set(setName, (bySet.get(setName) || 0) + quantity);
      byRarity.set(rarity, (byRarity.get(rarity) || 0) + quantity);
    }

    return {
      byRarity: Array.from(byRarity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      bySet: Array.from(bySet.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      totalCards,
    };
  }, [items]);

  const openCardDetails = async (cardId: string) => {
    try {
      const card = await cardService.getCardById(cardId);
      setSelectedCard(card);
      setIsCardModalVisible(true);
    } catch (error) {
      toast.showError(getApiErrorMessage(error));
    }
  };

  const handleDeleteItem = (item: CollectionItem) => {
    if (!collectionId || !item.id) {
      return;
    }
    const itemId = item.id;

    Alert.alert(
      "Retirer la carte",
      `Supprimer ${item.pokemonCard?.name || "cette carte"} de la collection ?`,
      [
        { style: "cancel", text: "Annuler" },
        {
          style: "destructive",
          text: "Supprimer",
          onPress: async () => {
            setIsDeletingItemId(itemId);
            try {
              await collectionService.deleteCollectionItem(
                collectionId,
                itemId,
              );
              if (isMasterSet) {
                setItems((prev) =>
                  prev.map((val) =>
                    val.pokemonCard?.id === item.pokemonCard?.id
                      ? { ...val, quantity: 0, id: null }
                      : val,
                  ),
                );
              } else {
                setItems((prev) => prev.filter((value) => value.id !== itemId));
              }
              toast.showSuccess("Carte retiree de la collection.");
              void loadCollectionHeader();
            } catch (error) {
              toast.showError(getApiErrorMessage(error));
            } finally {
              setIsDeletingItemId(null);
            }
          },
        },
      ],
    );
  };

  const handleDeleteCollection = () => {
    if (!collectionId || !collection) {
      return;
    }

    Alert.alert(
      "Supprimer la collection",
      `Confirmer la suppression de \"${collection.name}\" ?`,
      [
        { style: "cancel", text: "Annuler" },
        {
          style: "destructive",
          text: "Supprimer",
          onPress: async () => {
            try {
              await collectionService.deleteCollection(collectionId);
              toast.showSuccess("Collection supprimee.");
              router.replace("/collection");
            } catch (error) {
              toast.showError(getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const handleDecrementItem = async (item: CollectionItem) => {
    if (!collectionId || !item.pokemonCard?.id) {
      return;
    }

    const currentQty = Number(item.quantity || 0);
    if (currentQty <= 0) {
      return;
    }

    if (currentQty === 1) {
      if (isMasterSet) {
        if (!item.id) {
          toast.showError("Impossible de supprimer la carte : ID manquant.");
          return;
        }
        setIsDeletingItemId(item.id);
        // Optimistic update
        setItems((prev) =>
          prev.map((val) =>
            val.pokemonCard?.id === item.pokemonCard?.id
              ? { ...val, quantity: 0, id: null }
              : val,
          ),
        );
        try {
          await collectionService.deleteCollectionItem(collectionId, item.id);
          toast.showSuccess(`${item.pokemonCard.name || "Carte"} retirée.`);
          void loadCollectionHeader();
        } catch (error) {
          // Revert optimistic update
          setItems((prev) =>
            prev.map((val) =>
              val.pokemonCard?.id === item.pokemonCard?.id
                ? { ...val, quantity: 1, id: item.id }
                : val,
            ),
          );
          toast.showError(getApiErrorMessage(error));
        } finally {
          setIsDeletingItemId(null);
        }
        return;
      } else {
        handleDeleteItem(item);
        return;
      }
    }

    // Optimistic update
    setItems((prev) =>
      prev.map((val) =>
        val.pokemonCard?.id === item.pokemonCard?.id
          ? { ...val, quantity: currentQty - 1 }
          : val,
      ),
    );

    try {
      await collectionService.removeCardFromCollection(
        collectionId,
        item.pokemonCard.id,
      );
      toast.showSuccess(`${item.pokemonCard.name || "Carte"} retirée.`);
      void loadCollectionHeader();
    } catch (error) {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((val) =>
          val.pokemonCard?.id === item.pokemonCard?.id
            ? { ...val, quantity: currentQty }
            : val,
        ),
      );
      toast.showError(getApiErrorMessage(error));
    }
  };

  const handleIncrementItem = async (item: CollectionItem) => {
    if (!collectionId || !item.pokemonCard?.id) {
      return;
    }

    const currentQty = Number(item.quantity || 0);

    // Optimistic update
    setItems((prev) =>
      prev.map((val) =>
        val.pokemonCard?.id === item.pokemonCard?.id
          ? { ...val, quantity: currentQty + 1 }
          : val,
      ),
    );

    try {
      const response = await collectionService.addCardToCollection(
        collectionId,
        item.pokemonCard.id,
      );
      setItems((prev) =>
        prev.map((val) =>
          val.pokemonCard?.id === item.pokemonCard?.id
            ? { ...val, id: response.id, quantity: response.quantity }
            : val,
        ),
      );
      toast.showSuccess(`${item.pokemonCard.name || "Carte"} ajoutée.`);
      void loadCollectionHeader();
    } catch (error) {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((val) =>
          val.pokemonCard?.id === item.pokemonCard?.id
            ? { ...val, id: item.id, quantity: currentQty }
            : val,
        ),
      );
      toast.showError(getApiErrorMessage(error));
    }
  };

  const openManualAddModal = () => {
    setIsAddModalVisible(true);
  };

  const renderCardCell = ({ item }: { item: CollectionItem }) => {
    const card = item.pokemonCard;
    const isQtyZero = Number(item.quantity || 0) === 0;

    return (
      <View style={styles.cardCell}>
        <View style={styles.cardPressable}>
          <Pressable
            onPress={() => {
              if (card?.id) {
                void openCardDetails(card.id);
              }
            }}
            style={({ pressed }) => [
              styles.cardTopArea,
              pressed && styles.cardTopAreaPressed,
              isQtyZero && { opacity: 0.4 },
            ]}
          >
            <Image
              source={{ uri: getCardImage(card?.image, "low") }}
              style={styles.cardImage}
            />
            <Text numberOfLines={1} style={styles.cardName}>
              {card?.name || "Carte inconnue"}
            </Text>
            <Text numberOfLines={1} style={styles.cardMeta}>
              {card?.set?.name || "Set inconnu"}
            </Text>
          </Pressable>

          <View style={styles.cardQtyRow}>
            <Pressable
              disabled={
                (item.id ? isDeletingItemId === item.id : false) || isQtyZero
              }
              onPress={() => void handleDecrementItem(item)}
              style={({ pressed }) => [
                styles.cardQtyButton,
                pressed && styles.cardQtyButtonPressed,
                isQtyZero && { opacity: 0.3 },
              ]}
            >
              <Ionicons name="remove" size={12} color="#0b0b0b" />
            </Pressable>
            <Text style={styles.cardQtyText}>{item.quantity}</Text>
            <Pressable
              disabled={item.id ? isDeletingItemId === item.id : false}
              onPress={() => void handleIncrementItem(item)}
              style={({ pressed }) => [
                styles.cardQtyButton,
                pressed && styles.cardQtyButtonPressed,
              ]}
            >
              <Ionicons name="add" size={12} color="#0b0b0b" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.navButtonPressed,
          ]}
        >
          <Ionicons color="#0b0b0b" name="arrow-back" size={18} />
          <Text style={styles.navButtonText}>Retour</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/scan")}
          style={({ pressed }) => [
            styles.scanButton,
            pressed && styles.scanButtonPressed,
          ]}
        >
          <Ionicons color="#ffffff" name="scan" size={16} />
          <Text style={styles.scanButtonText}>Scanner</Text>
        </Pressable>
      </View>

      {!isMasterSet && (
        <>
          <Pressable
            onPress={openManualAddModal}
            style={({ pressed }) => [
              styles.manualAddButton,
              pressed && styles.manualAddButtonPressed,
            ]}
          >
            <Ionicons color="#ffffff" name="add-circle-outline" size={16} />
            <Text style={styles.manualAddButtonText}>
              Ajouter une carte manuellement
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDeleteCollection}
            style={({ pressed }) => [
              styles.deleteCollectionButton,
              pressed && styles.deleteCollectionButtonPressed,
            ]}
          >
            <Ionicons color="#ffffff" name="trash-outline" size={16} />
            <Text style={styles.deleteCollectionButtonText}>
              Supprimer cette collection
            </Text>
          </Pressable>
        </>
      )}

      <Text style={styles.collectionName}>
        {collection?.name || "Collection"}
      </Text>
      <Text style={styles.collectionDescription}>
        {collection?.description || "Gère les cartes de ta collection."}
      </Text>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>
          {stats.totalCards} cartes visibles
        </Text>
        <Text style={styles.statsText}>
          Par set:{" "}
          {stats.bySet
            .map(([name, count]) => `${name} (${count})`)
            .join(" • ") || "-"}
        </Text>
        <Text style={styles.statsText}>
          Par rarete:{" "}
          {stats.byRarity
            .map(([name, count]) => `${name} (${count})`)
            .join(" • ") || "-"}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={16}
            color="#777777"
            style={styles.searchIcon}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Rechercher (nom, rareté, set)..."
            placeholderTextColor="#777777"
            style={styles.searchInputField}
            value={search}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
              <Ionicons name="close-circle" size={16} color="#777777" />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterToggleButton,
            showFilters && styles.filterToggleButtonActive,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showFilters ? "#ffffff" : "#0b0b0b"}
          />
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filtersPanelTitle}>Filtres avancés</Text>

          {isMasterSet ? (
            <View style={styles.filterFieldRow}>
              <View style={styles.filterFieldContainer}>
                <Text style={styles.filterLabel}>Rareté</Text>
                <Pressable
                  onPress={() => setIsRarityModalVisible(true)}
                  style={styles.filterDropdown}
                >
                  <Text numberOfLines={1} style={styles.filterDropdownText}>
                    {selectedRarity || "Toutes les raretés"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#777777" />
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.filterFieldRow}>
                <View style={styles.filterFieldContainer}>
                  <Text style={styles.filterLabel}>Série</Text>
                  <Pressable
                    onPress={() => setIsSerieModalVisible(true)}
                    style={styles.filterDropdown}
                  >
                    <Text numberOfLines={1} style={styles.filterDropdownText}>
                      {selectedSerieId
                        ? series.find((s) => s.id === selectedSerieId)?.name
                        : "Toutes les séries"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#777777" />
                  </Pressable>
                </View>

                <View style={styles.filterFieldContainer}>
                  <Text style={styles.filterLabel}>Extension</Text>
                  <Pressable
                    onPress={() => setIsSetModalVisible(true)}
                    style={styles.filterDropdown}
                  >
                    <Text numberOfLines={1} style={styles.filterDropdownText}>
                      {selectedSetId
                        ? sets.find((s) => s.id === selectedSetId)?.name
                        : "Toutes les extensions"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#777777" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.filterFieldRow}>
                <View style={styles.filterFieldContainer}>
                  <Text style={styles.filterLabel}>Rareté</Text>
                  <Pressable
                    onPress={() => setIsRarityModalVisible(true)}
                    style={styles.filterDropdown}
                  >
                    <Text numberOfLines={1} style={styles.filterDropdownText}>
                      {selectedRarity || "Toutes les raretés"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#777777" />
                  </Pressable>
                </View>

                <View style={styles.filterFieldContainer}>
                  <Text style={styles.filterLabel}>État</Text>
                  <Pressable
                    onPress={() => setIsStateModalVisible(true)}
                    style={styles.filterDropdown}
                  >
                    <Text numberOfLines={1} style={styles.filterDropdownText}>
                      {selectedCardState
                        ? cardStates.find(
                            (cs) => cs.value === selectedCardState,
                          )?.label
                        : "Tous les états"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#777777" />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {hasActiveFilters && (
            <Pressable
              onPress={handleResetFilters}
              style={({ pressed }) => [
                styles.resetFiltersButton,
                pressed && styles.resetFiltersButtonPressed,
              ]}
            >
              <Ionicons name="refresh" size={14} color="#0b0b0b" />
              <Text style={styles.resetFiltersText}>
                Réinitialiser les filtres
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!isMasterSet && (
        <View style={styles.selectRow}>
          <Pressable onPress={handleSelectSortBy} style={styles.selectInput}>
            <Text style={styles.selectInputText}>
              Trier par : {getSortByLabel(sortBy)}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#555555" />
          </Pressable>

          <Pressable onPress={handleSelectSortOrder} style={styles.selectInput}>
            <Text style={styles.selectInputText}>
              Ordre : {sortOrder === "ASC" ? "Croissant" : "Décroissant"}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#555555" />
          </Pressable>
        </View>
      )}
    </View>
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator color="#0b0b0b" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) =>
          item.id ? String(item.id) : `card-${item.pokemonCard?.id}`
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {isMasterSet ? "Aucune carte" : "Collection vide"}
            </Text>
            <Text style={styles.emptyText}>
              {isMasterSet
                ? "Aucune carte ne correspond à vos filtres de recherche."
                : "Ajoute des cartes en scannant ou via la recherche."}
            </Text>
            {!isMasterSet && (
              <View style={styles.emptyActionsRow}>
                <Pressable
                  onPress={() => router.push("/scan")}
                  style={({ pressed }) => [
                    styles.emptyAction,
                    pressed && styles.emptyActionPressed,
                  ]}
                >
                  <Text style={styles.emptyActionText}>Scanner</Text>
                </Pressable>
                <Pressable
                  onPress={openManualAddModal}
                  style={({ pressed }) => [
                    styles.emptySecondaryAction,
                    pressed && styles.emptySecondaryActionPressed,
                  ]}
                >
                  <Text style={styles.emptySecondaryActionText}>
                    Ajouter manuellement
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? <ActivityIndicator color="#0b0b0b" /> : null
        }
        ListHeaderComponent={listHeader}
        numColumns={2}
        onEndReached={() => {
          void loadItems({ loadMore: true });
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void Promise.all([
                loadCollectionHeader(),
                loadItems({ refresh: true }),
              ]);
            }}
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

      <AddCardModal
        isVisible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        collectionId={collectionId as string}
        onCardAdded={async () => {
          await Promise.all([
            loadCollectionHeader(),
            loadItems({ refresh: true }),
          ]);
        }}
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

      <SelectionModal
        isVisible={isStateModalVisible}
        onClose={() => setIsStateModalVisible(false)}
        title="État"
        options={cardStates.map((cs) => ({ id: cs.value, name: cs.label }))}
        selectedValue={selectedCardState}
        onSelect={setSelectedCardState}
        showSearch={false}
      />

      <SelectionModal
        isVisible={isSortByModalVisible}
        onClose={() => setIsSortByModalVisible(false)}
        title="Trier par"
        options={[
          { id: "added_at", name: "Date d'ajout" },
          { id: "pokemonCard.name", name: "Nom" },
          { id: "pokemonCard.rarity", name: "Rareté" },
          { id: "quantity", name: "Quantité" },
        ]}
        selectedValue={sortBy}
        onSelect={(id) => {
          if (id) {
            setSortBy(id as any);
          }
        }}
        showSearch={false}
        showAllOption={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardCell: {
    flex: 1,
    maxWidth: "48.5%",
    marginBottom: 10,
    position: "relative",
  },
  cardImage: {
    backgroundColor: "#f3f5f9",
    borderRadius: 12,
    height: 210,
    width: "100%",
  },
  cardMeta: {
    color: "#555555",
    fontSize: 12,
  },
  cardName: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  cardPressable: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 8,
  },
  cardPressablePressed: {
    opacity: 0.86,
  },
  centeredScreen: {
    alignItems: "center",
    backgroundColor: "#fcfcfc",
    flex: 1,
    justifyContent: "center",
  },
  collectionDescription: {
    color: "#555555",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  collectionName: {
    color: "#0b0b0b",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },
  container: {
    backgroundColor: "#fcfcfc",
    flex: 1,
  },
  cardTopArea: {
    width: "100%",
  },
  cardTopAreaPressed: {
    opacity: 0.86,
  },
  cardQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fcfcfc",
    borderColor: "#e4e4e4",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    marginTop: 8,
  },
  cardQtyButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  cardQtyButtonPressed: {
    opacity: 0.5,
  },
  cardQtyText: {
    color: "#0b0b0b",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  deleteCollectionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#da2b29",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteCollectionButtonPressed: {
    opacity: 0.8,
  },
  deleteCollectionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyAction: {
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  emptyActionPressed: {
    opacity: 0.8,
  },
  emptyActionText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  emptySecondaryAction: {
    backgroundColor: "#ffffff",
    borderColor: "#0b0b0b",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptySecondaryActionPressed: {
    opacity: 0.8,
  },
  emptySecondaryActionText: {
    color: "#0b0b0b",
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    padding: 16,
  },
  emptyText: {
    color: "#555555",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#0b0b0b",
    fontSize: 17,
    fontWeight: "800",
  },
  clearButton: {
    padding: 4,
  },
  gridRow: {
    gap: 10,
    justifyContent: "space-between",
  },
  headerContainer: {
    marginBottom: 12,
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  manualAddButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0b0b0b",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  manualAddButtonPressed: {
    opacity: 0.84,
  },
  manualAddButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  manualAddCardButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 10,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  manualAddCardButtonPressed: {
    opacity: 0.8,
  },
  manualAddCardButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  manualEmptyText: {
    color: "#555555",
    marginTop: 12,
    textAlign: "center",
  },
  manualHint: {
    color: "#555555",
    fontSize: 13,
    marginTop: 8,
  },
  manualLoading: {
    marginTop: 12,
  },
  manualModalClose: {
    alignItems: "center",
    backgroundColor: "#f3f5f9",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  manualModalClosePressed: {
    opacity: 0.8,
  },
  manualModalContainer: {
    backgroundColor: "#fcfcfc",
    flex: 1,
    padding: 14,
    paddingTop: 20,
  },
  manualModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  manualModalTitle: {
    color: "#0b0b0b",
    fontSize: 22,
    fontWeight: "800",
  },
  manualResultCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    padding: 8,
  },
  manualResultContent: {
    flex: 1,
    gap: 2,
  },
  manualResultImage: {
    backgroundColor: "#f3f5f9",
    borderRadius: 8,
    height: 70,
    width: 50,
  },
  manualResultMeta: {
    color: "#555555",
    fontSize: 12,
  },
  manualResultName: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "700",
  },
  manualResultsList: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  manualSearchInput: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    color: "#0b0b0b",
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navButtonPressed: {
    opacity: 0.8,
  },
  navButtonText: {
    color: "#0b0b0b",
    fontWeight: "700",
  },
  scanButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scanButtonPressed: {
    opacity: 0.84,
  },
  scanButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 12,
  },
  searchContainer: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    height: 44,
    flex: 1,
    paddingHorizontal: 10,
  },
  filterToggleButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    width: 44,
  },
  filterToggleButtonActive: {
    backgroundColor: "#0b0b0b",
    borderColor: "#0b0b0b",
  },
  filtersPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  filtersPanelTitle: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  filterFieldRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  filterFieldContainer: {
    flex: 1,
  },
  filterLabel: {
    color: "#555555",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  filterDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fcfcfc",
    borderColor: "#e4e4e4",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    height: 38,
  },
  filterDropdownText: {
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    marginRight: 4,
  },
  filterTextInput: {
    backgroundColor: "#fcfcfc",
    borderColor: "#e4e4e4",
    borderRadius: 10,
    borderWidth: 1,
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 8,
    height: 38,
  },
  resetFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#e4e4e4",
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginTop: 6,
    paddingVertical: 8,
  },
  resetFiltersButtonPressed: {
    opacity: 0.8,
  },
  resetFiltersText: {
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "700",
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInputField: {
    color: "#0b0b0b",
    flex: 1,
    fontSize: 14,
    height: "100%",
    paddingVertical: 0,
  },
  selectRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  selectInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 40,
  },
  selectInputText: {
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  statsText: {
    color: "#555555",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  statsTitle: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "800",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
