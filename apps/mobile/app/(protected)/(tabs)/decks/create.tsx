import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radius } from "@/constants/theme";
import { deckService } from "@/services/deck.service";
import { cardService } from "@/services/card.service";
import { toast } from "@/store/useToastStore";
import type { Deck, DeckFormat, DeckCard, CardSearchResult } from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";
import { getCardImage } from "@/utils/images";

interface AddedCard {
  id?: number; // DB id for edit mode
  cardId: string;
  qty: number;
  role: "main" | "side";
  card?: CardSearchResult;
}

export default function CreateDeckScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const deckId = params.id;
  const isEditMode = !!deckId;

  const [loading, setLoading] = useState(false);
  const [deckLoading, setDeckLoading] = useState(false);
  const [initialDeck, setInitialDeck] = useState<Deck | null>(null);

  // Form Fields
  const [deckName, setDeckName] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<DeckFormat | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [addedCards, setAddedCards] = useState<AddedCard[]>([]);

  // Search Cards State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CardSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasNext, setSearchHasNext] = useState(false);

  // Modals visibility
  const [formats, setFormats] = useState<DeckFormat[]>([]);
  const [isFormatModalVisible, setIsFormatModalVisible] = useState(false);

  // Add Card Modal
  const [selectedCardToAdd, setSelectedCardToAdd] = useState<CardSearchResult | null>(null);
  const [addCardQty, setAddCardQty] = useState(1);
  const [addCardRole, setAddCardRole] = useState<"main" | "side">("main");
  const [isAddCardModalVisible, setIsAddCardModalVisible] = useState(false);

  // Load formats
  useEffect(() => {
    const loadFormats = async () => {
      try {
        const list = await deckService.getFormats();
        setFormats(list);
        if (list.length > 0 && !isEditMode) {
          setSelectedFormat(list[0] ?? null);
        }
      } catch (err) {
        console.error("Failed to load formats:", err);
      }
    };
    void loadFormats();
  }, [isEditMode]);

  // Load deck for edit mode
  useEffect(() => {
    const loadDeck = async () => {
      if (!deckId) return;
      setDeckLoading(true);
      try {
        const loaded = await deckService.getDeckById(deckId);
        setInitialDeck(loaded);
        setDeckName(loaded.name);
        setIsPublic(loaded.isPublic);
        setSelectedFormat(loaded.format ?? null);

        if (loaded.cards) {
          const mapped: AddedCard[] = loaded.cards.map((c) => ({
            id: c.id,
            cardId: c.card?.id || "",
            qty: c.qty,
            role: c.role,
            card: c.card,
          }));
          setAddedCards(mapped);
        }
      } catch (err) {
        toast.showError(getApiErrorMessage(err));
        router.back();
      } finally {
        setDeckLoading(false);
      }
    };
    void loadDeck();
  }, [deckId]);

  // Search card debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch cards
  const fetchCards = useCallback(
    async (options?: { loadMore?: boolean }) => {
      const loadMore = options?.loadMore === true;
      if (!debouncedSearch) {
        setSearchResults([]);
        setSearchHasNext(false);
        return;
      }

      setSearchLoading(true);
      try {
        const nextPage = loadMore ? searchPage + 1 : 1;
        const res = await cardService.getPaginated({
          limit: 12,
          page: nextPage,
          search: debouncedSearch,
        });

        if (loadMore) {
          setSearchResults((prev) => [...prev, ...res.data]);
        } else {
          setSearchResults(res.data);
        }
        setSearchPage(nextPage);
        setSearchHasNext(res.meta.hasNextPage);
      } catch (err) {
        console.error("Failed to load cards:", err);
      } finally {
        setSearchLoading(false);
      }
    },
    [debouncedSearch, searchPage],
  );

  useEffect(() => {
    void fetchCards();
  }, [debouncedSearch]);

  const handleOpenAddCardModal = (card: CardSearchResult) => {
    setSelectedCardToAdd(card);
    setAddCardQty(1);
    setAddCardRole("main");
    setIsAddCardModalVisible(true);
  };

  const handleConfirmAddCard = () => {
    if (!selectedCardToAdd) return;

    setAddedCards((prev) => {
      // Check if already in deck with the same role
      const existing = prev.find(
        (c) => c.cardId === selectedCardToAdd.id && c.role === addCardRole,
      );

      if (existing) {
        return prev.map((c) =>
          c.cardId === selectedCardToAdd.id && c.role === addCardRole
            ? { ...c, qty: Math.min(4, c.qty + addCardQty) }
            : c,
        );
      } else {
        return [
          ...prev,
          {
            cardId: selectedCardToAdd.id,
            qty: addCardQty,
            role: addCardRole,
            card: selectedCardToAdd,
          },
        ];
      }
    });

    setIsAddCardModalVisible(false);
    setSelectedCardToAdd(null);
    toast.showSuccess("Carte ajoutée !");
  };

  const handleUpdateQty = (cardId: string, role: "main" | "side", amount: number) => {
    setAddedCards((prev) =>
      prev
        .map((c) => {
          if (c.cardId === cardId && c.role === role) {
            const nextQty = c.qty + amount;
            if (nextQty <= 0) return null;
            return { ...c, qty: Math.min(4, nextQty) };
          }
          return c;
        })
        .filter((c): c is AddedCard => c !== null),
    );
  };

  const handleRemoveCard = (cardId: string, role: "main" | "side") => {
    setAddedCards((prev) => prev.filter((c) => !(c.cardId === cardId && c.role === role)));
  };

  const handleSubmit = async () => {
    if (!deckName.trim()) {
      toast.showError("Veuillez saisir un nom pour le deck.");
      return;
    }
    if (!selectedFormat) {
      toast.showError("Veuillez sélectionner un format.");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && initialDeck) {
        // Compute changes for update
        const initialCards = initialDeck.cards || [];

        const cardsToRemove = initialCards
          .filter((initial) => !addedCards.some((curr) => curr.id === initial.id))
          .filter((c) => c.id !== undefined)
          .map((c) => ({ id: c.id as number }));

        const cardsToUpdate = addedCards
          .filter((c) => c.id !== undefined)
          .map((c) => {
            const initial = initialCards.find((init) => init.id === c.id);
            if (initial && (initial.qty !== c.qty || initial.role !== c.role)) {
              return {
                id: c.id!,
                qty: c.qty,
                role: c.role as string,
              };
            }
            return null;
          })
          .filter((c): c is { id: number; qty: number; role: string } => c !== null);

        const cardsToAdd = addedCards
          .filter((c) => c.id === undefined)
          .map((c) => ({
            cardId: c.cardId,
            qty: c.qty,
            role: c.role,
          }));

        const payload = {
          deckName,
          formatId: String(selectedFormat.id),
          isPublic,
          cardsToAdd,
          cardsToRemove,
          cardsToUpdate,
        };

        const updated = await deckService.update(initialDeck.id, payload);
        toast.showSuccess("Deck modifié avec succès !");
        router.replace(`/decks/${updated.id}`);
      } else {
        // Create new deck
        const cardsPayload = addedCards.map((c) => ({
          cardId: c.cardId,
          qty: c.qty,
          role: c.role,
        }));

        const creationData = {
          deckName,
          formatId: selectedFormat.id,
          isPublic,
          cards: cardsPayload,
        };

        const created = await deckService.create(creationData);
        toast.showSuccess("Deck créé avec succès !");
        router.replace(`/decks/${created.id}`);
      }
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Card counts
  const mainCount = useMemo(() => addedCards.filter((c) => c.role === "main").reduce((acc, c) => acc + c.qty, 0), [addedCards]);
  const sideCount = useMemo(() => addedCards.filter((c) => c.role === "side").reduce((acc, c) => acc + c.qty, 0), [addedCards]);

  if (deckLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement du deck...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Navigation back */}
        <View style={styles.navHeader}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          >
            <Ionicons name="close" size={24} color={colors.foreground} />
            <Text style={styles.backBtnText}>Annuler</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{isEditMode ? "Modifier le Deck" : "Nouveau Deck"}</Text>
        </View>

        {/* Deck metadata card */}
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Nom du Deck</Text>
          <TextInput
            placeholder="Nom de mon deck..."
            placeholderTextColor="#888888"
            value={deckName}
            onChangeText={setDeckName}
            style={styles.textInput}
          />

          <View style={styles.dropdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Format</Text>
              <Pressable
                onPress={() => setIsFormatModalVisible(true)}
                style={styles.dropdownButton}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedFormat ? selectedFormat.type : "Choisir le format"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Rendre ce deck public</Text>
              <Text style={styles.switchDescription}>
                Permet aux autres joueurs de voir, copier et sauvegarder votre deck.
              </Text>
            </View>
            <Pressable
              onPress={() => setIsPublic(!isPublic)}
              style={[styles.toggleBtn, isPublic && styles.toggleBtnActive]}
            >
              <View style={[styles.toggleCircle, isPublic && styles.toggleCircleActive]} />
            </Pressable>
          </View>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistiques en temps réel</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{mainCount}</Text>
              <Text style={[styles.statLabel, mainCount > 60 && { color: colors.destructive }]}>
                Principal (Max 60)
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{sideCount}</Text>
              <Text style={[styles.statLabel, sideCount > 15 && { color: colors.destructive }]}>
                Side (Max 15)
              </Text>
            </View>
          </View>
        </View>

        {/* Selected cards list */}
        <View style={styles.selectedCardsPanel}>
          <Text style={styles.panelTitle}>Cartes sélectionnées ({addedCards.length})</Text>

          {addedCards.length > 0 ? (
            <View style={styles.addedList}>
              {addedCards.map((item) => (
                <View key={item.id ? `db-${item.id}` : `new-${item.cardId}-${item.role}`} style={styles.addedCardRow}>
                  <View style={styles.addedCardImageContainer}>
                    {item.card?.image ? (
                      <Image
                        source={{ uri: getCardImage(item.card.image, "low") }}
                        style={styles.addedCardImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={16} color="#cccccc" />
                    )}
                  </View>
                  <View style={styles.addedCardInfo}>
                    <Text numberOfLines={1} style={styles.addedCardName}>
                      {item.card?.name}
                    </Text>
                    <Text style={styles.addedCardMeta}>
                      {item.card?.set?.name} •{" "}
                      <Text style={{ fontWeight: "700", color: colors.primary }}>
                        {item.role === "main" ? "Main" : "Side"}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.addedCardActions}>
                    <Pressable
                      onPress={() => handleUpdateQty(item.cardId, item.role, -1)}
                      style={styles.qtyActionBtn}
                    >
                      <Ionicons name="remove" size={14} color={colors.foreground} />
                    </Pressable>
                    <Text style={styles.qtyActionVal}>{item.qty}</Text>
                    <Pressable
                      onPress={() => handleUpdateQty(item.cardId, item.role, 1)}
                      style={styles.qtyActionBtn}
                    >
                      <Ionicons name="add" size={14} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveCard(item.cardId, item.role)}
                      style={styles.removeActionBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptySelectedText}>Recherchez et ajoutez des cartes ci-dessous.</Text>
          )}
        </View>

        {/* Card Search & Add */}
        <View style={styles.cardSearchPanel}>
          <Text style={styles.panelTitle}>Ajouter des Cartes</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
            <TextInput
              placeholder="Rechercher par nom..."
              placeholderTextColor="#888888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchBarInput}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {searchLoading && searchResults.length === 0 ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.searchResultsGrid}>
              {searchResults.map((card) => {
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => handleOpenAddCardModal(card)}
                    style={({ pressed }) => [styles.searchResultItem, pressed && styles.cardPressed]}
                  >
                    <View style={styles.searchResultImageContainer}>
                      {card.image ? (
                        <Image
                          source={{ uri: getCardImage(card.image, "low") }}
                          style={styles.searchResultImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="image-outline" size={24} color="#cccccc" />
                      )}
                    </View>
                    <Text numberOfLines={1} style={styles.searchResultName}>
                      {card.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {searchHasNext && !searchLoading && (
            <Pressable
              onPress={() => void fetchCards({ loadMore: true })}
              style={({ pressed }) => [styles.loadMoreBtn, pressed && styles.backBtnPressed]}
            >
              <Text style={styles.loadMoreBtnText}>Charger plus de cartes</Text>
            </Pressable>
          )}
        </View>

        {/* Form Submit */}
        <Pressable
          disabled={loading}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [styles.submitBtn, pressed && styles.backBtnPressed]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {isEditMode ? "Modifier le Deck" : "Créer le Deck"}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Format Select Dropdown Modal */}
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
              {formats.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setSelectedFormat(f);
                    setIsFormatModalVisible(false);
                  }}
                  style={styles.bottomSheetItem}
                >
                  <Text
                    style={[
                      styles.bottomSheetItemText,
                      selectedFormat?.id === f.id && styles.bottomSheetItemTextActive,
                    ]}
                  >
                    {f.type}
                  </Text>
                  {selectedFormat?.id === f.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Card Quantities Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={isAddCardModalVisible}
        onRequestClose={() => setIsAddCardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter au Deck</Text>
            <Text style={styles.modalDescription}>
              Choisissez la quantité et le rôle de la carte dans le deck.
            </Text>
            {selectedCardToAdd && (
              <Text style={styles.modalCardName}>{selectedCardToAdd.name}</Text>
            )}

            {/* Qty selectors */}
            <Text style={styles.modalLabel}>Quantité</Text>
            <View style={styles.qtySelectRow}>
              {[1, 2, 3, 4].map((q) => (
                <Pressable
                  key={`qty-${q}`}
                  onPress={() => setAddCardQty(q)}
                  style={[styles.qtySelectBox, addCardQty === q && styles.qtySelectBoxActive]}
                >
                  <Text
                    style={[styles.qtySelectBoxText, addCardQty === q && styles.qtySelectBoxTextActive]}
                  >
                    {q}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Role Selectors */}
            <Text style={styles.modalLabel}>Rôle dans le deck</Text>
            <View style={styles.roleSelectRow}>
              <Pressable
                onPress={() => setAddCardRole("main")}
                style={[styles.roleSelectBox, addCardRole === "main" && styles.roleSelectBoxActive]}
              >
                <Text
                  style={[styles.roleSelectBoxText, addCardRole === "main" && styles.roleSelectBoxTextActive]}
                >
                  Principal (Main)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAddCardRole("side")}
                style={[styles.roleSelectBox, addCardRole === "side" && styles.roleSelectBoxActive]}
              >
                <Text
                  style={[styles.roleSelectBoxText, addCardRole === "side" && styles.roleSelectBoxTextActive]}
                >
                  Side deck
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setIsAddCardModalVisible(false);
                  setSelectedCardToAdd(null);
                }}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmAddCard}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                <Text style={styles.modalButtonConfirmText}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addedCardActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  addedCardImage: {
    height: "100%",
    width: "100%",
  },
  addedCardImageContainer: {
    aspectRatio: 0.71,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  addedCardInfo: {
    flex: 1,
    paddingHorizontal: 8,
  },
  addedCardMeta: {
    color: colors.mutedForeground,
    fontSize: 10,
    marginTop: 2,
  },
  addedCardName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  addedCardRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 8,
  },
  addedList: {
    marginTop: 6,
  },
  backBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backBtnText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
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
  cardPressed: {
    opacity: 0.8,
  },
  cardSearchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  dropdownButton: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    height: 44,
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  dropdownButtonText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  emptySelectedText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 16,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
    marginRight: 24,
  },
  inputLabel: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadMoreBtn: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    marginTop: 14,
    paddingVertical: 12,
  },
  loadMoreBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 14,
    marginTop: 12,
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
  modalCardName: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },
  modalDescription: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  modalLabel: {
    alignSelf: "flex-start",
    color: colors.foreground,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
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
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  navHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  panelTitle: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qtyActionBtn: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  qtyActionVal: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    width: 20,
  },
  qtySelectBox: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  qtySelectBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  qtySelectBoxText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  qtySelectBoxTextActive: {
    color: colors.primaryForeground,
  },
  qtySelectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  removeActionBtn: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    marginLeft: 6,
    width: 28,
  },
  roleSelectBox: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  roleSelectBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleSelectBoxText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "600",
  },
  roleSelectBoxTextActive: {
    color: colors.primaryForeground,
    fontWeight: "700",
  },
  roleSelectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    width: "100%",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    height: 40,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  searchBarInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchResultImage: {
    height: "100%",
    width: "100%",
  },
  searchResultImageContainer: {
    aspectRatio: 0.71,
    backgroundColor: colors.surfaceMuted,
    width: "100%",
  },
  searchResultItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: "hidden",
    width: "23%",
  },
  searchResultName: {
    color: colors.foreground,
    fontSize: 9,
    fontWeight: "700",
    padding: 4,
    textAlign: "center",
  },
  searchResultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  selectedCardsPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  statNumber: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  statsGrid: {
    flexDirection: "row",
    marginTop: 10,
  },
  statsTitle: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  submitBtn: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    marginTop: 24,
  },
  submitBtnText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: "800",
  },
  switchDescription: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginTop: 2,
  },
  switchLabel: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  switchRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 14,
  },
  textInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 12,
  },
  toggleBtn: {
    backgroundColor: "#e4e4e4",
    borderRadius: radius.full,
    height: 28,
    padding: 2,
    width: 48,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleCircle: {
    backgroundColor: "#ffffff",
    borderRadius: radius.full,
    height: 24,
    width: 24,
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
});
