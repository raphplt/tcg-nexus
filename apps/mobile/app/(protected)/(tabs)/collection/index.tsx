import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { CollectionCard } from "@/components/CollectionCard";
import { useAuth } from "@/contexts/AuthProvider";
import { cardService } from "@/services/card.service";
import {
  collectionService,
  type CreateCollectionPayload,
} from "@/services/collection.service";
import { toast } from "@/store/useToastStore";
import type { PokemonSetType, UserCollection } from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";

const getTotalCards = (collection: UserCollection): number =>
  (collection.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

export default function CollectionScreen() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionIsPublic, setNewCollectionIsPublic] = useState(false);

  const standardCollections = useMemo(
    () => collections.filter((col) => !col.masterSet),
    [collections],
  );

  const masterSetCollections = useMemo(
    () => collections.filter((col) => col.masterSet != null),
    [collections],
  );

  // Set selection modal state
  const [isSetSelectionVisible, setIsSetSelectionVisible] = useState(false);
  const [allSets, setAllSets] = useState<PokemonSetType[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [setSearchQuery, setSetSearchQuery] = useState("");

  const loadCollections = useCallback(
    async (refresh = false) => {
      if (!user?.id) {
        setCollections([]);
        setIsLoading(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await collectionService.getMyCollections();
        setCollections(data);
      } catch (error) {
        toast.showError(getApiErrorMessage(error));
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const handleOpenSetSelection = async () => {
    setIsSetSelectionVisible(true);
    if (allSets.length === 0) {
      setIsLoadingSets(true);
      try {
        const sets = await cardService.getAllSets();
        setAllSets(sets);
      } catch (error) {
        toast.showError(getApiErrorMessage(error));
      } finally {
        setIsLoadingSets(false);
      }
    }
  };

  const alreadyStartedSetIds = useMemo(
    () =>
      new Set(masterSetCollections.map((c) => c.masterSet?.id).filter(Boolean)),
    [masterSetCollections],
  );

  const filteredSets = useMemo(() => {
    const query = setSearchQuery.trim().toLowerCase();
    const filtered = query
      ? allSets.filter((s) => s.name.toLowerCase().includes(query))
      : allSets;
    return filtered;
  }, [allSets, setSearchQuery]);

  const groupedSets = useMemo(() => {
    const map = new Map<
      string,
      { serieName: string; sets: PokemonSetType[] }
    >();
    for (const set of filteredSets) {
      const serieName = set.serie?.name || "Autres";
      const serieId = set.serie?.id || "_other";
      if (!map.has(serieId)) {
        map.set(serieId, { serieName, sets: [] });
      }
      map.get(serieId)!.sets.push(set);
    }
    return Array.from(map.values());
  }, [filteredSets]);

  const handleCreateMasterSet = async (setId: string, setName: string) => {
    if (!user?.id) {
      return;
    }

    const payload: CreateCollectionPayload = {
      masterSetId: setId,
      isPublic: false,
      userId: user.id,
    };

    setIsCreating(true);
    try {
      await collectionService.createCollection(payload);
      toast.showSuccess(`Master Set ${setName} créé !`);
      setIsSetSelectionVisible(false);
      setSetSearchQuery("");
      await loadCollections(true);
    } catch (error) {
      toast.showError(getApiErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const totalCards = useMemo(
    () =>
      collections.reduce(
        (sum, collection) => sum + getTotalCards(collection),
        0,
      ),
    [collections],
  );

  const rarityStats = useMemo(() => {
    const map = new Map<string, number>();

    for (const collection of collections) {
      for (const item of collection.items || []) {
        const rarity = item.pokemonCard?.rarity || "Inconnue";
        const quantity = Number(item.quantity || 0);
        map.set(rarity, (map.get(rarity) || 0) + quantity);
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [collections]);

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      toast.showError("Le nom de collection est requis.");
      return;
    }

    const payload: CreateCollectionPayload = {
      name,
      description: newCollectionDescription.trim() || undefined,
      isPublic: newCollectionIsPublic,
      userId: user?.id,
    };

    setIsCreating(true);

    try {
      await collectionService.createCollection(payload);
      toast.showSuccess("Collection creee.");
      setIsCreateModalVisible(false);
      setNewCollectionName("");
      setNewCollectionDescription("");
      setNewCollectionIsPublic(false);
      await loadCollections();
    } catch (error) {
      toast.showError(getApiErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = (collection: UserCollection) => {
    console.log("delete collection", collection);
    
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Confirmer la suppression de "${collection.name}" ?`);
      if (confirmed) {
        collectionService
          .deleteCollection(collection.id)
          .then(async () => {
            toast.showSuccess("Collection supprimee.");
            await loadCollections(true);
          })
          .catch((error) => {
            toast.showError(getApiErrorMessage(error));
          });
      }
      return;
    }

    Alert.alert(
      "Supprimer la collection",
      `Confirmer la suppression de "${collection.name}" ?`,
      [
        {
          style: "cancel",
          text: "Annuler",
        },
        {
          style: "destructive",
          text: "Supprimer",
          onPress: async () => {
            try {
              await collectionService.deleteCollection(collection.id);
              toast.showSuccess("Collection supprimee.");
              await loadCollections(true);
            } catch (error) {
              toast.showError(getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.eyebrow}>COLLECTIONS</Text>
          <Text style={styles.title}>Ma collection</Text>
        </View>

        <Pressable
          onPress={() => {
            router.push("/scan");
          }}
          style={({ pressed }) => [
            styles.scanButton,
            pressed && styles.scanButtonPressed,
          ]}
        >
          <Ionicons color="#ffffff" name="scan" size={16} />
          <Text style={styles.scanButtonText}>Scanner</Text>
        </Pressable>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>{collections.length} collections</Text>
        <Text style={styles.statsSubtitle}>{totalCards} cartes au total</Text>

        {rarityStats.length > 0 ? (
          <Text style={styles.statsMeta}>
            Raretés:{" "}
            {rarityStats
              .map(([rarity, count]) => `${rarity} (${count})`)
              .join(" • ")}
          </Text>
        ) : (
          <Text style={styles.statsMeta}>
            Ajoute des cartes pour voir tes stats.
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => setIsCreateModalVisible(true)}
        style={({ pressed }) => [
          styles.createButton,
          pressed && styles.createButtonPressed,
        ]}
      >
        <Ionicons color="#ffffff" name="add-circle-outline" size={18} />
        <Text style={styles.createButtonText}>Nouvelle collection</Text>
      </Pressable>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.masterSection}>
      <Text style={styles.sectionTitle}>Master Sets</Text>

      {masterSetCollections.map((col) => (
        <CollectionCard
          key={col.id}
          collection={col}
          onDelete={handleDeleteCollection}
          onPress={(collection) => {
            router.push(`/collection/${collection.id}`);
          }}
        />
      ))}

      <Pressable
        onPress={() => void handleOpenSetSelection()}
        style={({ pressed }) => [
          styles.masterCreateButton,
          pressed && styles.masterCreateButtonPressed,
        ]}
      >
        <Ionicons color="#ffffff" name="add-circle-outline" size={16} />
        <Text style={styles.masterCreateButtonText}>Nouveau Master Set</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={standardCollections}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !isLoading && standardCollections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                Aucune collection pour le moment
              </Text>
              <Text style={styles.emptyText}>
                Cree ta premiere collection ou scanne une carte pour demarrer.
              </Text>

              <View style={styles.emptyActionsRow}>
                <Pressable
                  onPress={() => setIsCreateModalVisible(true)}
                  style={({ pressed }) => [
                    styles.emptyPrimaryAction,
                    pressed && styles.emptyPrimaryActionPressed,
                  ]}
                >
                  <Text style={styles.emptyPrimaryActionText}>Creer</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    router.push("/scan");
                  }}
                  style={({ pressed }) => [
                    styles.emptySecondaryAction,
                    pressed && styles.emptySecondaryActionPressed,
                  ]}
                >
                  <Text style={styles.emptySecondaryActionText}>
                    Scanner une carte
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void loadCollections(true);
            }}
            refreshing={isRefreshing}
            tintColor="#0b0b0b"
          />
        }
        renderItem={({ item }) => (
          <CollectionCard
            collection={item}
            onDelete={handleDeleteCollection}
            onPress={(collection) => {
              router.push(`/collection/${collection.id}`);
            }}
          />
        )}
      />

      <Modal
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
        transparent
        visible={isCreateModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle collection</Text>

            <TextInput
              onChangeText={setNewCollectionName}
              placeholder="Nom de la collection"
              placeholderTextColor="#555555"
              style={styles.modalInput}
              value={newCollectionName}
            />

            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setNewCollectionDescription}
              placeholder="Description (optionnelle)"
              placeholderTextColor="#555555"
              style={[styles.modalInput, styles.modalTextArea]}
              value={newCollectionDescription}
            />

            <View style={styles.modalSwitchRow}>
              <Text style={styles.modalSwitchLabel}>Collection publique</Text>
              <Switch
                onValueChange={setNewCollectionIsPublic}
                trackColor={{ false: "#e4e4e4", true: "#b72921" }}
                value={newCollectionIsPublic}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <Pressable
                onPress={() => setIsCreateModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalCancel,
                  pressed && styles.modalCancelPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handleCreateCollection();
                }}
                style={({ pressed }) => [
                  styles.modalConfirm,
                  (pressed || isCreating) && styles.modalConfirmPressed,
                ]}
              >
                <Text style={styles.modalConfirmText}>
                  {isCreating ? "Creation..." : "Creer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setIsSetSelectionVisible(false);
          setSetSearchQuery("");
        }}
        transparent
        visible={isSetSelectionVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Choisir une extension</Text>

            <TextInput
              autoCapitalize="none"
              onChangeText={setSetSearchQuery}
              placeholder="Rechercher une extension..."
              placeholderTextColor="#555555"
              style={styles.modalInput}
              value={setSearchQuery}
            />

            {isLoadingSets ? (
              <Text style={styles.setLoadingText}>
                Chargement des extensions...
              </Text>
            ) : (
              <ScrollView style={styles.setListContainer}>
                {groupedSets.map((group) => (
                  <View key={group.serieName}>
                    <Text style={styles.setGroupTitle}>{group.serieName}</Text>
                    {group.sets.map((set) => {
                      const alreadyStarted = alreadyStartedSetIds.has(set.id);
                      return (
                        <Pressable
                          key={set.id}
                          disabled={alreadyStarted || isCreating}
                          onPress={() =>
                            void handleCreateMasterSet(set.id, set.name)
                          }
                          style={({ pressed }) => [
                            styles.setListItem,
                            (pressed || alreadyStarted) &&
                              styles.setListItemDisabled,
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.setListItemText,
                              alreadyStarted && styles.setListItemTextDisabled,
                            ]}
                          >
                            {set.name}
                          </Text>
                          {alreadyStarted && (
                            <Text style={styles.setListItemBadge}>
                              Déjà créé
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                {groupedSets.length === 0 && !isLoadingSets && (
                  <Text style={styles.setLoadingText}>
                    Aucune extension trouvée.
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActionsRow}>
              <Pressable
                onPress={() => {
                  setIsSetSelectionVisible(false);
                  setSetSearchQuery("");
                }}
                style={({ pressed }) => [
                  styles.modalCancel,
                  pressed && styles.modalCancelPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fcfcfc",
    flex: 1,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 174,
  },
  createButtonPressed: {
    opacity: 0.85,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  emptyPrimaryAction: {
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyPrimaryActionPressed: {
    opacity: 0.8,
  },
  emptyPrimaryActionText: {
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
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    padding: 18,
  },
  emptyText: {
    color: "#555555",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#0b0b0b",
    fontSize: 17,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#b72921",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  headerBlock: {
    marginBottom: 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalCancel: {
    backgroundColor: "#f3f5f9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelPressed: {
    opacity: 0.8,
  },
  modalCancelText: {
    color: "#0b0b0b",
    fontWeight: "700",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  modalConfirm: {
    backgroundColor: "#0b0b0b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalConfirmPressed: {
    opacity: 0.8,
  },
  modalConfirmText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 10,
    borderWidth: 1,
    color: "#0b0b0b",
    fontSize: 15,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalSwitchLabel: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSwitchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalTitle: {
    color: "#0b0b0b",
    fontSize: 18,
    fontWeight: "800",
  },
  scanButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scanButtonPressed: {
    opacity: 0.86,
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  statsMeta: {
    color: "#555555",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  statsSubtitle: {
    color: "#09597d",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  statsTitle: {
    color: "#0b0b0b",
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    color: "#0b0b0b",
    fontSize: 28,
    fontWeight: "800",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  masterSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e4",
    paddingTop: 20,
  },
  sectionTitle: {
    color: "#0b0b0b",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  masterSetPromo: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  masterSetName: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "800",
  },
  masterSetDesc: {
    color: "#555555",
    fontSize: 13,
    marginTop: 4,
  },
  masterCreateButton: {
    backgroundColor: "#0b0b0b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  masterCreateButtonPressed: {
    opacity: 0.8,
  },
  masterCreateButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  setListContainer: {
    flex: 1,
    marginTop: 12,
  },
  setGroupTitle: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 6,
  },
  setListItemDisabled: {
    opacity: 0.5,
  },
  setListItemText: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  setListItemTextDisabled: {
    color: "#777777",
  },
  setListItemBadge: {
    color: "#09597d",
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "#e0f0f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  setLoadingText: {
    color: "#777777",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});
