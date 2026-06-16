import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

    if (debouncedManualSearch.length < 2) {
      setManualResults([]);
      setIsManualSearching(false);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      console.log("runSearch")
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

  // Reset when modal opens
  useEffect(() => {
    if (isVisible) {
      setManualSearch("");
      setDebouncedManualSearch("");
      setManualResults([]);
      setIsManualSearching(false);
    }
  }, [isVisible]);

  const handleAddCardFromSearch = async (card: CardSearchResult) => {
    if (!collectionId || !card.id) {
      return;
    }

    setAddingCardId(card.id);
    try {
      await collectionService.addCardToCollection(collectionId, card.id);
      toast.showSuccess(`${card.name || "Carte"} ajoutée.`);
      await onCardAdded();
    } catch (error) {
      toast.showError(getApiErrorMessage(error));
    } finally {
      setAddingCardId(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={isVisible}
    >
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

        {debouncedManualSearch.length < 2 ? (
          <Text style={styles.manualHint}>Tape au moins 2 caractères pour rechercher.</Text>
        ) : null}

        {isManualSearching ? (
          <ActivityIndicator color="#15233b" style={styles.manualLoading} />
        ) : null}

        <FlatList
          contentContainerStyle={styles.manualResultsList}
          data={manualResults}
          keyExtractor={(item) => item.id || Math.random().toString()}
          ListEmptyComponent={
            !isManualSearching && debouncedManualSearch.length >= 2 ? (
              <Text style={styles.manualEmptyText}>Aucun résultat.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.manualResultCard}>
              <Image source={{ uri: getCardImage(item.image) }} style={styles.manualResultImage} />

              <View style={styles.manualResultContent}>
                <Text numberOfLines={1} style={styles.manualResultName}>
                  {item.name || "Carte"}
                </Text>
                <Text numberOfLines={1} style={styles.manualResultMeta}>
                  {item.set?.name || "Set inconnu"}
                </Text>
                <Text numberOfLines={1} style={styles.manualResultMeta}>
                  {item.rarity || "Rareté inconnue"}
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
});
