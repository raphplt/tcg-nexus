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
} from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";

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
  value: "added_at" | "pokemonCard.name" | "pokemonCard.rarity";
}> = [
  { label: "Date", value: "added_at" },
  { label: "Nom", value: "pokemonCard.name" },
  { label: "Rarete", value: "pokemonCard.rarity" },
];

const dedupeItems = (items: CollectionItem[]): CollectionItem[] => {
  const seen = new Set<number>();
  const next: CollectionItem[] = [];

  for (const item of items) {
    if (!item.id || seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    next.push(item);
  }

  return next;
};

export default function CollectionDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [collection, setCollection] = useState<UserCollection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [meta, setMeta] = useState<CollectionItemsPaginatedResponse["meta"] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeletingItemId, setIsDeletingItemId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"added_at" | "pokemonCard.name" | "pokemonCard.rarity">(
    "added_at",
  );
  const [selectedSetFilter, setSelectedSetFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(null);
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [debouncedManualSearch, setDebouncedManualSearch] = useState("");
  const [manualResults, setManualResults] = useState<CardSearchResult[]>([]);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [addingCardId, setAddingCardId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedManualSearch(manualSearch.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [manualSearch]);

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
        const response = await collectionService.getCollectionItems(collectionId, {
          limit: PAGE_SIZE,
          page: nextPage,
          search: debouncedSearch || undefined,
          sortBy,
          sortOrder: sortBy === "added_at" ? "DESC" : "ASC",
        });

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
    [collectionId, debouncedSearch, isLoadingMore, meta?.currentPage, meta?.hasNextPage, sortBy],
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
  }, [debouncedSearch, sortBy]);

  useEffect(() => {
    if (!isAddModalVisible) {
      return;
    }

    if (debouncedManualSearch.length < 2) {
      setManualResults([]);
      setIsManualSearching(false);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setIsManualSearching(true);
      try {
        const cards = await cardService.searchCards(debouncedManualSearch);
        if (!cancelled) {
          setManualResults(cards.slice(0, 30));
        }
      } catch (error) {
        if (!cancelled) {
          toast.showError(getApiErrorMessage(error));
          setManualResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsManualSearching(false);
        }
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedManualSearch, isAddModalVisible]);

  const availableSetFilters = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) {
      if (item.pokemonCard?.set?.name) {
        values.add(item.pokemonCard.set.name);
      }
    }
    return Array.from(values).sort();
  }, [items]);

  const availableTypeFilters = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) {
      if (item.pokemonCard?.category) {
        values.add(item.pokemonCard.category);
      }
    }
    return Array.from(values).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSet =
        selectedSetFilter === "all" || item.pokemonCard?.set?.name === selectedSetFilter;
      const matchesType =
        selectedTypeFilter === "all" || item.pokemonCard?.category === selectedTypeFilter;

      return matchesSet && matchesType;
    });
  }, [items, selectedSetFilter, selectedTypeFilter]);

  const stats = useMemo(() => {
    const totalCards = filteredItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const bySet = new Map<string, number>();
    const byRarity = new Map<string, number>();

    for (const item of filteredItems) {
      const quantity = Number(item.quantity || 0);
      const setName = item.pokemonCard?.set?.name || "Inconnu";
      const rarity = item.pokemonCard?.rarity || "Inconnue";

      bySet.set(setName, (bySet.get(setName) || 0) + quantity);
      byRarity.set(rarity, (byRarity.get(rarity) || 0) + quantity);
    }

    return {
      byRarity: Array.from(byRarity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      bySet: Array.from(bySet.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      totalCards,
    };
  }, [filteredItems]);

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

    Alert.alert(
      "Retirer la carte",
      `Supprimer ${item.pokemonCard?.name || "cette carte"} de la collection ?`,
      [
        { style: "cancel", text: "Annuler" },
        {
          style: "destructive",
          text: "Supprimer",
          onPress: async () => {
            setIsDeletingItemId(item.id);
            try {
              await collectionService.deleteCollectionItem(collectionId, item.id);
              setItems((prev) => prev.filter((value) => value.id !== item.id));
              toast.showSuccess("Carte retiree de la collection.");
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

  const handleAddCardFromSearch = async (card: CardSearchResult) => {
    if (!collectionId || !card.id) {
      return;
    }

    setAddingCardId(card.id);
    try {
      await collectionService.addCardToCollection(collectionId, card.id);
      toast.showSuccess(`${card.name || "Carte"} ajoutee.`);
      await Promise.all([loadCollectionHeader(), loadItems({ refresh: true })]);
    } catch (error) {
      toast.showError(getApiErrorMessage(error));
    } finally {
      setAddingCardId(null);
    }
  };

  const openManualAddModal = () => {
    setIsAddModalVisible(true);
    setManualSearch("");
    setDebouncedManualSearch("");
    setManualResults([]);
    setIsManualSearching(false);
  };

  const renderCardCell = ({ item }: { item: CollectionItem }) => {
    const card = item.pokemonCard;

    return (
      <View style={styles.cardCell}>
        <Pressable
          onPress={() => {
            if (card?.id) {
              void openCardDetails(card.id);
            }
          }}
          style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressablePressed]}
        >
          <Image
            source={{ uri: resolveImage(card?.image) }}
            style={styles.cardImage}
          />
          <Text numberOfLines={1} style={styles.cardName}>
            {card?.name || "Carte inconnue"}
          </Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {card?.set?.name || "Set inconnu"}
          </Text>
          <Text style={styles.cardMeta}>x{item.quantity}</Text>
        </Pressable>

        <Pressable
          disabled={isDeletingItemId === item.id}
          onPress={() => handleDeleteItem(item)}
          style={({ pressed }) => [
            styles.deleteBadge,
            (pressed || isDeletingItemId === item.id) && styles.deleteBadgePressed,
          ]}
        >
          <Ionicons color="#ffffff" name="trash-outline" size={14} />
        </Pressable>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
        >
          <Ionicons color="#0b0b0b" name="arrow-back" size={18} />
          <Text style={styles.navButtonText}>Retour</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/scan")}
          style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
        >
          <Ionicons color="#ffffff" name="scan" size={16} />
          <Text style={styles.scanButtonText}>Scanner</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={openManualAddModal}
        style={({ pressed }) => [styles.manualAddButton, pressed && styles.manualAddButtonPressed]}
      >
        <Ionicons color="#ffffff" name="add-circle-outline" size={16} />
        <Text style={styles.manualAddButtonText}>Ajouter une carte manuellement</Text>
      </Pressable>

      <Pressable
        onPress={handleDeleteCollection}
        style={({ pressed }) => [styles.deleteCollectionButton, pressed && styles.deleteCollectionButtonPressed]}
      >
        <Ionicons color="#ffffff" name="trash-outline" size={16} />
        <Text style={styles.deleteCollectionButtonText}>Supprimer cette collection</Text>
      </Pressable>

      <Text style={styles.collectionName}>{collection?.name || "Collection"}</Text>
      <Text style={styles.collectionDescription}>
        {collection?.description || "Gère les cartes de ta collection."}
      </Text>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>{stats.totalCards} cartes visibles</Text>
        <Text style={styles.statsText}>
          Par set: {stats.bySet.map(([name, count]) => `${name} (${count})`).join(" • ") || "-"}
        </Text>
        <Text style={styles.statsText}>
          Par rarete: {stats.byRarity.map(([name, count]) => `${name} (${count})`).join(" • ") || "-"}
        </Text>
      </View>

      <TextInput
        autoCapitalize="none"
        onChangeText={setSearch}
        placeholder="Rechercher une carte dans la collection"
        placeholderTextColor="#555555"
        style={styles.searchInput}
        value={search}
      />

      <View style={styles.sortRow}>
        {sortOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setSortBy(option.value)}
            style={({ pressed }) => [
              styles.sortChip,
              sortBy === option.value && styles.sortChipActive,
              pressed && styles.sortChipPressed,
            ]}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === option.value && styles.sortChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <Pressable
          onPress={() => setSelectedSetFilter("all")}
          style={[styles.filterChip, selectedSetFilter === "all" && styles.filterChipActive]}
        >
          <Text
            style={[styles.filterChipText, selectedSetFilter === "all" && styles.filterChipTextActive]}
          >
            Tous les sets
          </Text>
        </Pressable>

        {availableSetFilters.map((setName) => (
          <Pressable
            key={`set-${setName}`}
            onPress={() => setSelectedSetFilter(setName)}
            style={[
              styles.filterChip,
              selectedSetFilter === setName && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedSetFilter === setName && styles.filterChipTextActive,
              ]}
            >
              {setName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <Pressable
          onPress={() => setSelectedTypeFilter("all")}
          style={[styles.filterChip, selectedTypeFilter === "all" && styles.filterChipActive]}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedTypeFilter === "all" && styles.filterChipTextActive,
            ]}
          >
            Tous les types
          </Text>
        </Pressable>

        {availableTypeFilters.map((typeName) => (
          <Pressable
            key={`type-${typeName}`}
            onPress={() => setSelectedTypeFilter(typeName)}
            style={[
              styles.filterChip,
              selectedTypeFilter === typeName && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTypeFilter === typeName && styles.filterChipTextActive,
              ]}
            >
              {typeName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
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
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Collection vide</Text>
            <Text style={styles.emptyText}>
              Ajoute des cartes en scannant ou via la recherche.
            </Text>
            <View style={styles.emptyActionsRow}>
              <Pressable
                onPress={() => router.push("/scan")}
                style={({ pressed }) => [styles.emptyAction, pressed && styles.emptyActionPressed]}
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
                <Text style={styles.emptySecondaryActionText}>Ajouter manuellement</Text>
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={isLoadingMore ? <ActivityIndicator color="#0b0b0b" /> : null}
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

      <Modal
        animationType="slide"
        onRequestClose={() => setIsCardModalVisible(false)}
        visible={isCardModalVisible}
      >
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Pressable
            onPress={() => setIsCardModalVisible(false)}
            style={({ pressed }) => [styles.modalClose, pressed && styles.modalClosePressed]}
          >
            <Ionicons color="#0b0b0b" name="close" size={22} />
          </Pressable>

          <Image source={{ uri: resolveImage(selectedCard?.image) }} style={styles.modalImage} />

          <Text style={styles.modalTitle}>{selectedCard?.name || "Carte"}</Text>
          <Text style={styles.modalMeta}>
            {selectedCard?.set?.name || "Set inconnu"} • {selectedCard?.rarity || "Rarete inconnue"}
          </Text>

          <Text style={styles.modalSectionTitle}>Informations</Text>
          <Text style={styles.modalText}>HP: {selectedCard?.pokemonDetails?.hp || "-"}</Text>
          <Text style={styles.modalText}>
            Types: {(selectedCard?.pokemonDetails?.types || []).join(", ") || "-"}
          </Text>
          <Text style={styles.modalText}>Stage: {selectedCard?.pokemonDetails?.stage || "-"}</Text>
          <Text style={styles.modalText}>
            {selectedCard?.pokemonDetails?.description || "Aucune description disponible."}
          </Text>

          <Text style={styles.modalSectionTitle}>Attaques</Text>
          {(selectedCard?.pokemonDetails?.attacks || []).length > 0 ? (
            selectedCard?.pokemonDetails?.attacks?.map((attack, index) => (
              <View key={`attack-${index}`} style={styles.attackCard}>
                <Text style={styles.attackName}>
                  {attack.name || "Attaque"}
                  {attack.damage ? ` - ${attack.damage}` : ""}
                </Text>
                <Text style={styles.attackText}>{attack.effect || "Sans effet texte."}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.modalText}>Aucune attaque detaillee disponible.</Text>
          )}
        </ScrollView>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
        visible={isAddModalVisible}
      >
        <View style={styles.manualModalContainer}>
          <View style={styles.manualModalHeader}>
            <Text style={styles.manualModalTitle}>Ajouter une carte</Text>
            <Pressable
              onPress={() => setIsAddModalVisible(false)}
              style={({ pressed }) => [
                styles.manualModalClose,
                pressed && styles.manualModalClosePressed,
              ]}
            >
              <Ionicons color="#0b0b0b" name="close" size={20} />
            </Pressable>
          </View>

          <TextInput
            autoCapitalize="none"
            onChangeText={setManualSearch}
            placeholder="Nom, set, numero"
            placeholderTextColor="#555555"
            style={styles.manualSearchInput}
            value={manualSearch}
          />

          {debouncedManualSearch.length < 2 ? (
            <Text style={styles.manualHint}>Tape au moins 2 caracteres pour rechercher.</Text>
          ) : null}

          {isManualSearching ? (
            <ActivityIndicator color="#0b0b0b" style={styles.manualLoading} />
          ) : null}

          <FlatList
            contentContainerStyle={styles.manualResultsList}
            data={manualResults}
            keyExtractor={(item) => item.id || Math.random().toString()}
            ListEmptyComponent={
              !isManualSearching && debouncedManualSearch.length >= 2 ? (
                <Text style={styles.manualEmptyText}>Aucun resultat.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={styles.manualResultCard}>
                <Image source={{ uri: resolveImage(item.image) }} style={styles.manualResultImage} />

                <View style={styles.manualResultContent}>
                  <Text numberOfLines={1} style={styles.manualResultName}>
                    {item.name || "Carte"}
                  </Text>
                  <Text numberOfLines={1} style={styles.manualResultMeta}>
                    {item.set?.name || "Set inconnu"}
                  </Text>
                  <Text numberOfLines={1} style={styles.manualResultMeta}>
                    {item.rarity || "Rarete inconnue"}
                  </Text>
                </View>

                <Pressable
                  disabled={addingCardId === item.id}
                  onPress={() => {
                    void handleAddCardFromSearch(item);
                  }}
                  style={({ pressed }) => [
                    styles.manualAddCardButton,
                    (pressed || addingCardId === item.id) &&
                      styles.manualAddCardButtonPressed,
                  ]}
                >
                  <Text style={styles.manualAddCardButtonText}>
                    {addingCardId === item.id ? "Ajout..." : "Ajouter"}
                  </Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  attackCard: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  attackName: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "800",
  },
  attackText: {
    color: "#555555",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  cardCell: {
    flex: 1,
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
  deleteBadge: {
    alignItems: "center",
    backgroundColor: "#da2b29",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 24,
  },
  deleteBadgePressed: {
    opacity: 0.75,
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
  filterChip: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: "#0b0b0b",
    borderColor: "#0b0b0b",
  },
  filterChipText: {
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  filterRow: {
    marginTop: 8,
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
  modalClose: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#f3f5f9",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  modalClosePressed: {
    opacity: 0.8,
  },
  modalContent: {
    backgroundColor: "#fcfcfc",
    padding: 16,
    paddingBottom: 34,
  },
  modalImage: {
    alignSelf: "center",
    borderRadius: 14,
    height: 320,
    marginTop: 12,
    resizeMode: "contain",
    width: "100%",
  },
  modalMeta: {
    color: "#555555",
    fontSize: 14,
    marginTop: 6,
  },
  modalSectionTitle: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 14,
  },
  modalText: {
    color: "#555555",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  modalTitle: {
    color: "#0b0b0b",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 12,
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
  searchInput: {
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
  sortChip: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortChipActive: {
    backgroundColor: "#b72921",
    borderColor: "#b72921",
  },
  sortChipPressed: {
    opacity: 0.82,
  },
  sortChipText: {
    color: "#0b0b0b",
    fontSize: 12,
    fontWeight: "700",
  },
  sortChipTextActive: {
    color: "#ffffff",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
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
