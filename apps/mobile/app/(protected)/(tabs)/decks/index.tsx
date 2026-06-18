import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { colors, radius } from "@/constants/theme";
import { deckService } from "@/services/deck.service";
import { toast } from "@/store/useToastStore";
import type { Deck, DeckFormat } from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";

export default function DecksIndexScreen() {
  const [trendingDecks, setTrendingDecks] = useState<Deck[]>([]);
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [savedDecks, setSavedDecks] = useState<Deck[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);

  const [formats, setFormats] = useState<DeckFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<number | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Filter Modals State
  const [isFormatModalVisible, setIsFormatModalVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  const sortOptions = [
    { label: "Date de création", value: "createdAt" },
    { label: "Nom", value: "name" },
    { label: "Vues", value: "views" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load formats
  useEffect(() => {
    const loadFormats = async () => {
      try {
        const formatsList = await deckService.getFormats();
        setFormats(formatsList);
      } catch (err) {
        console.error("Failed to load formats:", err);
      }
    };
    void loadFormats();
  }, []);

  const fetchHorizontalDecks = async () => {
    try {
      const [trendingRes, myRes, savedRes] = await Promise.all([
        deckService.getPaginated({ page: 1, limit: 5, sortBy: "views", sortOrder: "DESC" }),
        deckService.getUserDecksPaginated({ page: 1, limit: 5 }),
        deckService.getSavedDecksPaginated({ page: 1, limit: 5 }),
      ]);
      setTrendingDecks(trendingRes.data || []);
      setMyDecks(myRes.data || []);
      setSavedDecks(savedRes.data || []);
    } catch (err) {
      console.error("Failed to fetch horizontal decks list:", err);
    }
  };

  const loadAllDecks = useCallback(
    async (options?: { loadMore?: boolean; refresh?: boolean }) => {
      const loadMore = options?.loadMore === true;
      const refresh = options?.refresh === true;

      if (loadMore) {
        if (!hasNextPage || isLoadingMore) return;
        setIsLoadingMore(true);
      } else if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const nextPage = loadMore ? currentPage + 1 : 1;
        const response = await deckService.getPaginated({
          limit: 10,
          page: nextPage,
          search: debouncedSearch || undefined,
          formatId: selectedFormatId,
          sortBy,
          sortOrder,
        });

        if (loadMore) {
          setAllDecks((prev) => [...prev, ...(response.data || [])]);
        } else {
          setAllDecks(response.data || []);
        }

        setCurrentPage(response.meta.currentPage);
        setHasNextPage(response.meta.hasNextPage);
      } catch (error) {
        toast.showError(getApiErrorMessage(error));
      } finally {
        if (loadMore) setIsLoadingMore(false);
        else if (refresh) setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [currentPage, debouncedSearch, hasNextPage, isLoadingMore, selectedFormatId, sortBy, sortOrder],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHorizontalDecks(), loadAllDecks({ refresh: true })]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void fetchHorizontalDecks();
  }, []);

  useEffect(() => {
    void loadAllDecks();
  }, [debouncedSearch, selectedFormatId, sortBy, sortOrder]);

  const handleImportDeck = async () => {
    if (!importCode.trim()) {
      toast.showError("Veuillez saisir un code.");
      return;
    }

    setIsImporting(true);
    try {
      const imported = await deckService.importDeck(importCode.trim());
      toast.showSuccess("Deck importé avec succès !");
      setImportModalVisible(false);
      setImportCode("");
      router.push(`/decks/${imported.id}`);
      void handleRefresh();
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  const renderHorizontalDeckCard = (deck: Deck) => {
    return (
      <Pressable
        key={deck.id}
        onPress={() => {
          void deckService.incrementView(deck.id);
          router.push(`/decks/${deck.id}`);
        }}
        style={({ pressed }) => [styles.horizontalCard, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeaderBg}>
          <Ionicons name="copy-outline" size={24} color={colors.primary} />
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>{deck.format?.type || "Standard"}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.deckNameText}>
            {deck.name}
          </Text>
          <Text numberOfLines={1} style={styles.creatorText}>
            Par {deck.user?.firstName || "Anonyme"}
          </Text>
          <View style={styles.cardViewsRow}>
            <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
            <Text style={styles.viewsCountText}>{deck.views || 0} vues</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderVerticalDeckCard = ({ item }: { item: Deck }) => {
    return (
      <Pressable
        onPress={() => {
          void deckService.incrementView(item.id);
          router.push(`/decks/${item.id}`);
        }}
        style={({ pressed }) => [styles.verticalCard, pressed && styles.cardPressed]}
      >
        <View style={styles.verticalCardIcon}>
          <Ionicons name="layers" size={24} color={colors.primary} />
        </View>
        <View style={styles.verticalCardContent}>
          <Text numberOfLines={1} style={styles.verticalCardTitle}>
            {item.name}
          </Text>
          <Text numberOfLines={1} style={styles.verticalCardSubtitle}>
            Par {item.user?.firstName || "Anonyme"} • {item.format?.type || "Standard"}
          </Text>
        </View>
        <View style={styles.verticalCardMeta}>
          <View style={styles.metaStat}>
            <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
            <Text style={styles.metaStatText}>{item.views || 0}</Text>
          </View>
          {item.cards && item.cards.length > 0 && (
            <View style={styles.metaStat}>
              <Ionicons name="albums-outline" size={12} color={colors.mutedForeground} />
              <Text style={styles.metaStatText}>
                {item.cards.reduce((sum, c) => sum + c.qty, 0)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Actions bar */}
        <View style={styles.actionsBar}>
          <Pressable
            onPress={() => router.push("/decks/create")}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          >
            <Ionicons name="add-circle" size={18} color={colors.primaryForeground} />
            <Text style={styles.actionButtonText}>Créer un Deck</Text>
          </Pressable>

          <Pressable
            onPress={() => setImportModalVisible(true)}
            style={({ pressed }) => [styles.actionSecondaryButton, pressed && styles.actionSecondaryButtonPressed]}
          >
            <Ionicons name="download-outline" size={18} color={colors.foreground} />
            <Text style={styles.actionSecondaryButtonText}>Importer</Text>
          </Pressable>
        </View>

        {/* Horizontal Sections */}
        {myDecks.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Mes Decks</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {myDecks.map(renderHorizontalDeckCard)}
            </ScrollView>
          </View>
        )}

        {savedDecks.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Bibliothèque (Sauvegardés)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {savedDecks.map(renderHorizontalDeckCard)}
            </ScrollView>
          </View>
        )}

        {trendingDecks.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Tendances de la communauté</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {trendingDecks.map(renderHorizontalDeckCard)}
            </ScrollView>
          </View>
        )}

        {/* All Decks list title & Filters */}
        <View style={styles.allDecksHeaderRow}>
          <Text style={styles.sectionHeader}>Tous les Decks</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#777777" style={styles.searchIcon} />
            <TextInput
              autoCapitalize="none"
              onChangeText={setSearch}
              placeholder="Rechercher un deck..."
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
        </View>

        {/* Filters pills */}
        <View style={styles.filterPillsRow}>
          <Pressable
            onPress={() => setIsFormatModalVisible(true)}
            style={[styles.filterPill, selectedFormatId !== undefined && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, selectedFormatId !== undefined && styles.filterPillTextActive]}>
              {selectedFormatId !== undefined
                ? formats.find((f) => f.id === selectedFormatId)?.type || "Format"
                : "Format"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={selectedFormatId !== undefined ? colors.primary : colors.mutedForeground}
            />
          </Pressable>

          <Pressable
            onPress={() => setIsSortModalVisible(true)}
            style={styles.filterPill}
          >
            <Text style={styles.filterPillText}>
              Tri: {sortOptions.find((o) => o.value === sortBy)?.label || "Date"}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
          </Pressable>

          {(selectedFormatId !== undefined || search.trim().length > 0 || sortBy !== "createdAt") && (
            <Pressable
              onPress={() => {
                setSearch("");
                setSelectedFormatId(undefined);
                setSortBy("createdAt");
                setSortOrder("DESC");
              }}
              style={styles.resetPill}
            >
              <Ionicons name="refresh" size={12} color={colors.primary} />
              <Text style={styles.resetPillText}>Réinitialiser</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={allDecks}
        keyExtractor={(item) => `deck-${item.id}`}
        renderItem={renderVerticalDeckCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="layers-outline" size={48} color="#cccccc" />
              <Text style={styles.emptyTitle}>Aucun deck trouvé</Text>
              <Text style={styles.emptySubtitle}>
                Créez le premier deck ou importez-en un avec un code de partage !
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore || isLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (!isLoadingMore && !isLoading && hasNextPage) {
            void loadAllDecks({ loadMore: true });
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={() => void handleRefresh()}
            refreshing={isRefreshing}
            tintColor={colors.primary}
          />
        }
      />

      {/* Import Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={importModalVisible}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Importer un Deck</Text>
            <Text style={styles.modalDescription}>
              Saisissez le code de partage du deck que vous souhaitez importer dans votre bibliothèque.
            </Text>
            <TextInput
              autoCapitalize="characters"
              placeholder="Code de partage (ex: DECK-XXXX)"
              placeholderTextColor="#888888"
              onChangeText={setImportCode}
              style={styles.modalInput}
              value={importCode}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setImportModalVisible(false);
                  setImportCode("");
                }}
                disabled={isImporting}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleImportDeck()}
                disabled={isImporting || !importCode.trim()}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                {isImporting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Importer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Format Selection Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isFormatModalVisible}
        onRequestClose={() => setIsFormatModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Choisir le format</Text>
              <Pressable onPress={() => setIsFormatModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={styles.bottomSheetList}>
              <Pressable
                onPress={() => {
                  setSelectedFormatId(undefined);
                  setIsFormatModalVisible(false);
                }}
                style={styles.bottomSheetItem}
              >
                <Text
                  style={[
                    styles.bottomSheetItemText,
                    selectedFormatId === undefined && styles.bottomSheetItemTextActive,
                  ]}
                >
                  Tous les formats
                </Text>
                {selectedFormatId === undefined && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
              {formats.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setSelectedFormatId(f.id);
                    setIsFormatModalVisible(false);
                  }}
                  style={styles.bottomSheetItem}
                >
                  <Text
                    style={[
                      styles.bottomSheetItemText,
                      selectedFormatId === f.id && styles.bottomSheetItemTextActive,
                    ]}
                  >
                    {f.type}
                  </Text>
                  {selectedFormatId === f.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sort Selection Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isSortModalVisible}
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Trier par</Text>
              <Pressable onPress={() => setIsSortModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={styles.bottomSheetList}>
              {sortOptions.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    setSortBy(o.value);
                    setSortOrder(o.value === "name" ? "ASC" : "DESC");
                    setIsSortModalVisible(false);
                  }}
                  style={styles.bottomSheetItem}
                >
                  <Text
                    style={[
                      styles.bottomSheetItemText,
                      sortBy === o.value && styles.bottomSheetItemTextActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                  {sortBy === o.value && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: "700",
  },
  actionSecondaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionSecondaryButtonPressed: {
    opacity: 0.7,
  },
  actionSecondaryButtonText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  actionsBar: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 12,
  },
  allDecksHeaderRow: {
    marginTop: 24,
  },
  bottomSheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "60%",
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    width: "100%",
  },
  bottomSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bottomSheetItem: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  bottomSheetItemText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "500",
  },
  bottomSheetItemTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  bottomSheetList: {
    marginHorizontal: -4,
  },
  bottomSheetOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    flex: 1,
    justifyContent: "flex-end",
  },
  bottomSheetTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  cardBody: {
    padding: 10,
  },
  cardHeaderBg: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 70,
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardViewsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  clearButton: {
    padding: 4,
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  creatorText: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginTop: 2,
  },
  deckNameText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 64,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingBottom: 12,
  },
  footerLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  formatBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  formatText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  horizontalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginRight: 12,
    overflow: "hidden",
    width: 140,
  },
  horizontalScrollContent: {
    paddingBottom: 4,
    paddingRight: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  metaStat: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  metaStatText: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  modalButton: {
    borderRadius: radius.md,
    flex: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalButtonCancelText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: "700",
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonConfirmText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: "700",
  },
  modalDescription: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 15,
    height: 44,
    paddingHorizontal: 12,
    width: "100%",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  resetPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  resetPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: -2,
  },
  searchInputField: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sectionContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  sectionHeader: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  verticalCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
  },
  verticalCardContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  verticalCardIcon: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  verticalCardMeta: {
    alignItems: "flex-end",
    gap: 4,
    justifyContent: "center",
  },
  verticalCardSubtitle: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginTop: 2,
  },
  verticalCardTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  viewsCountText: {
    color: colors.mutedForeground,
    fontSize: 10,
  },
});
