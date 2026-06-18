import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { toast } from "@/store/useToastStore";
import { getApiErrorMessage } from "@/utils/apiError";
import { getCardImage } from "@/utils/images";
import type { CardSearchResult } from "@/types";

interface AddCardModalProps {
  isVisible: boolean;
  onClose: () => void;
  collectionId: string;
  onCardAdded: () => Promise<void>;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isVisible,
  onClose,
  collectionId,
  onCardAdded,
}) => {
  const [manualSearch, setManualSearch] = useState("");
  const [debouncedManualSearch, setDebouncedManualSearch] = useState("");
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [manualResults, setManualResults] = useState<CardSearchResult[]>([]);
  const [addingCardId, setAddingCardId] = useState<string | null>(null);
  const [collectionQuantities, setCollectionQuantities] = useState<
    Record<string, number>
  >({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debounce manual search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedManualSearch(manualSearch.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [manualSearch]);

  // Execute manual search
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (debouncedManualSearch.length < 1) {
      setManualResults([]);
      setIsManualSearching(false);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      console.log("runSearch");
      setIsManualSearching(true);
      console.log("debouncedManualSearch : ", debouncedManualSearch);
      try {
        const cards = await cardService.searchCards(debouncedManualSearch);
        console.log("cards : ", cards);
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
  }, [debouncedManualSearch, isVisible]);

  // Reset and fetch initial quantities when modal opens
  useEffect(() => {
    if (isVisible) {
      setManualSearch("");
      setDebouncedManualSearch("");
      setManualResults([]);
      setIsManualSearching(false);
      setCollectionQuantities({});
      setSuccessMessage(null);

      if (collectionId) {
        const loadInitialQuantities = async () => {
          try {
            const data =
              await collectionService.getCollectionById(collectionId);
            const quantities: Record<string, number> = {};
            if (data.items) {
              for (const item of data.items) {
                if (item.pokemonCard?.id) {
                  quantities[item.pokemonCard.id] =
                    (quantities[item.pokemonCard.id] || 0) + item.quantity;
                }
              }
            }
            setCollectionQuantities(quantities);
          } catch (error) {
            console.error("Failed to load initial quantities:", error);
          }
        };
        void loadInitialQuantities();
      }
    }
  }, [isVisible, collectionId]);

  // Auto-clear success banner message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleIncrement = async (card: CardSearchResult) => {
    const cardId = card.id;
    if (!collectionId || !cardId) {
      return;
    }

    // Optimistically update quantities
    setCollectionQuantities((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] || 0) + 1,
    }));

    setAddingCardId(cardId);
    try {
      await collectionService.addCardToCollection(collectionId, cardId);
      setSuccessMessage(`"${card.name || "Carte"}" ajoutée !`);
      toast.showSuccess(`${card.name || "Carte"} ajoutée.`);
      await onCardAdded();
    } catch (error) {
      // Revert optimistic update
      setCollectionQuantities((prev) => ({
        ...prev,
        [cardId]: Math.max(0, (prev[cardId] || 1) - 1),
      }));
      const errMsg = getApiErrorMessage(error);
      toast.showError(errMsg);
      Alert.alert("Erreur", errMsg);
    } finally {
      setAddingCardId(null);
    }
  };

  const handleDecrement = async (card: CardSearchResult) => {
    const cardId = card.id;
    if (!collectionId || !cardId) {
      return;
    }

    const currentQty = collectionQuantities[cardId] || 0;
    if (currentQty <= 0) {
      return;
    }

    // Optimistically update quantities
    setCollectionQuantities((prev) => {
      const next = { ...prev };
      const current = next[cardId] ?? 0;
      if (current > 1) {
        next[cardId] = current - 1;
      } else {
        delete next[cardId];
      }
      return next;
    });

    setAddingCardId(cardId);
    try {
      await collectionService.removeCardFromCollection(collectionId, cardId);
      setSuccessMessage(`"${card.name || "Carte"}" retirée !`);
      toast.showSuccess(`${card.name || "Carte"} retirée.`);
      await onCardAdded();
    } catch (error) {
      // Revert optimistic update
      setCollectionQuantities((prev) => ({
        ...prev,
        [cardId]: currentQty,
      }));
      const errMsg = getApiErrorMessage(error);
      toast.showError(errMsg);
      Alert.alert("Erreur", errMsg);
    } finally {
      setAddingCardId(null);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={isVisible}>
      <View style={styles.manualModalContainer}>
        <View style={styles.manualModalHeader}>
          <Text style={styles.manualModalTitle}>Ajouter une carte</Text>
          <Pressable
            onPress={onClose}
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
          placeholder="Nom, set, numéro"
          placeholderTextColor="#8a92a0"
          style={styles.manualSearchInput}
          value={manualSearch}
        />

        {successMessage ? (
          <View style={styles.successBanner}>
            <Ionicons color="#1b5e20" name="checkmark-circle" size={16} />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        ) : null}

        {debouncedManualSearch.length < 1 ? (
          <Text style={styles.manualHint}>
            Tape au moins 1 caractère pour rechercher.
          </Text>
        ) : null}

        {isManualSearching ? (
          <ActivityIndicator color="#15233b" style={styles.manualLoading} />
        ) : null}

        <FlatList
          contentContainerStyle={styles.manualResultsList}
          data={manualResults}
          keyExtractor={(item) => item.id || Math.random().toString()}
          ListEmptyComponent={
            !isManualSearching && debouncedManualSearch.length >= 1 ? (
              <Text style={styles.manualEmptyText}>Aucun résultat.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const cardQty = item.id ? (collectionQuantities[item.id] ?? 0) : 0;
            return (
              <View style={styles.manualResultCard}>
                <Image
                  source={{ uri: getCardImage(item.image, "low") }}
                  style={styles.manualResultImage}
                />

                <View style={styles.manualResultContent}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.manualResultName, { flexShrink: 1 }]}
                    >
                      {item.name || "Carte"}
                    </Text>
                    {cardQty > 0 ? (
                      <View style={styles.addedBadge}>
                        <Text style={styles.addedBadgeText}>x{cardQty}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={styles.manualResultMeta}>
                    {item.set?.name || "Set inconnu"}
                  </Text>
                  <Text numberOfLines={1} style={styles.manualResultMeta}>
                    {item.rarity || "Rareté inconnue"}
                  </Text>
                </View>

                {cardQty > 0 ? (
                  <View style={styles.qtyContainer}>
                    <Pressable
                      disabled={addingCardId === item.id}
                      onPress={() => void handleDecrement(item)}
                      style={({ pressed }) => [
                        styles.qtyButton,
                        pressed && styles.qtyButtonPressed,
                      ]}
                    >
                      <Ionicons color="#15233b" name="remove" size={16} />
                    </Pressable>
                    <Text style={styles.qtyText}>{cardQty}</Text>
                    <Pressable
                      disabled={addingCardId === item.id}
                      onPress={() => void handleIncrement(item)}
                      style={({ pressed }) => [
                        styles.qtyButton,
                        pressed && styles.qtyButtonPressed,
                      ]}
                    >
                      <Ionicons color="#15233b" name="add" size={16} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    disabled={addingCardId === item.id}
                    onPress={() => {
                      void handleIncrement(item);
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
                )}
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  manualAddCardButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
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
    color: "#fff8f3",
    fontSize: 12,
    fontWeight: "700",
  },
  manualEmptyText: {
    color: "#5f6978",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
  },
  manualHint: {
    color: "#5f6978",
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  manualLoading: {
    marginVertical: 20,
  },
  manualModalClose: {
    alignItems: "center",
    backgroundColor: "#eadfd3",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  manualModalClosePressed: {
    opacity: 0.7,
  },
  manualModalContainer: {
    backgroundColor: "#f7f1e8",
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  manualModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  manualModalTitle: {
    color: "#15233b",
    fontSize: 20,
    fontWeight: "800",
  },
  manualResultCard: {
    alignItems: "center",
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 10,
  },
  manualResultContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  manualResultImage: {
    backgroundColor: "#f0f2f7",
    borderRadius: 8,
    height: 60,
    width: 45,
  },
  manualResultMeta: {
    color: "#6d7786",
    fontSize: 12,
    marginTop: 2,
  },
  manualResultName: {
    color: "#15233b",
    fontSize: 14,
    fontWeight: "700",
  },
  manualResultsList: {
    paddingBottom: 40,
  },
  manualSearchInput: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 12,
    borderWidth: 1,
    color: "#15233b",
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addedBadge: {
    backgroundColor: "#2e7d32",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addedBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  successBanner: {
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderColor: "#c8e6c9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  successBannerText: {
    color: "#1b5e20",
    fontSize: 14,
    fontWeight: "600",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: "space-between",
    minWidth: 96,
  },
  qtyButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 30,
  },
  qtyButtonPressed: {
    opacity: 0.5,
  },
  qtyText: {
    color: "#15233b",
    fontSize: 14,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
});
