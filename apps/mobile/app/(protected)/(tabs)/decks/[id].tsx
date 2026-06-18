import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
  Modal,
} from "react-native";
import { colors, radius } from "@/constants/theme";
import { deckService } from "@/services/deck.service";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "@/store/useToastStore";
import type { Deck, DeckCard, DeckAnalysis } from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";
import { getCardImage } from "@/utils/images";
import { CardDetailModal } from "@/components/CardDetailModal";

const normalizeCategory = (cat?: string) =>
  cat?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

export default function DeckDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deckId = Array.isArray(id) ? id[0] : id;

  const { user } = useAuth();
  const navigation = useNavigation();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavedPending, setIsSavedPending] = useState(false);

  // Sharing & Exporting State
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);

  const [jsonExport, setJsonExport] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isExportPending, setIsExportPending] = useState(false);

  // Analysis State
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [isAnalysisPending, setIsAnalysisPending] = useState(false);

  // Modal Card Detail
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<"main" | "side">("main");

  const isOwner = useMemo(() => {
    return !!user && !!deck && deck.user?.id === user.id;
  }, [user, deck]);

  const loadDeckData = useCallback(async (showFullLoader = true) => {
    if (!deckId) return;
    if (showFullLoader) {
      setIsLoading(true);
    }
    try {
      const deckData = await deckService.getDeckById(deckId);
      setDeck(deckData);

      const savedIds = await deckService.getSavedDeckIds();
      setIsSaved(savedIds.includes(Number(deckId)));
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
      router.back();
    } finally {
      if (showFullLoader) {
        setIsLoading(false);
      }
    }
  }, [deckId]);

  useEffect(() => {
    void loadDeckData(true);
  }, [deckId, loadDeckData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void loadDeckData(false);
    });
    return unsubscribe;
  }, [navigation, loadDeckData]);

  const handleToggleSave = async () => {
    if (!deck || isSavedPending) return;
    setIsSavedPending(true);
    try {
      if (isSaved) {
        await deckService.removeDeckFromLibrary(deck.id);
        setIsSaved(false);
        toast.showSuccess("Retiré de la bibliothèque");
      } else {
        await deckService.saveDeckToLibrary(deck.id);
        setIsSaved(true);
        toast.showSuccess("Ajouté à la bibliothèque");
      }
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
    } finally {
      setIsSavedPending(false);
    }
  };

  const handleShareDeck = async () => {
    if (!deck) return;
    setIsSharePending(true);
    try {
      const res = await deckService.shareDeck(deck.id);
      setShareCode(res.code);
      setShareModalVisible(true);
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
    } finally {
      setIsSharePending(false);
    }
  };

  const handleNativeShareCode = async () => {
    if (!shareCode) return;
    try {
      await Share.share({
        message: `Voici le code de partage pour mon deck Pokémon "${deck?.name}" : ${shareCode}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportJson = async () => {
    if (!deck) return;
    setIsExportPending(true);
    try {
      const data = await deckService.exportDeckJson(deck.id);
      setJsonExport(JSON.stringify(data, null, 2));
      setExportModalVisible(true);
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
    } finally {
      setIsExportPending(false);
    }
  };

  const handleAnalyzeDeck = async () => {
    if (!deck) return;
    setIsAnalysisPending(true);
    try {
      const result = await deckService.analyzeDeck(deck.id);
      setAnalysis(result);
      toast.showSuccess("Analyse du deck terminée !");
    } catch (err) {
      toast.showError(getApiErrorMessage(err));
    } finally {
      setIsAnalysisPending(false);
    }
  };

  const handleDeleteDeck = () => {
    if (!deck) return;
    Alert.alert(
      "Supprimer le deck",
      `Êtes-vous sûr de vouloir supprimer définitivement le deck "${deck.name}" ?`,
      [
        { style: "cancel", text: "Annuler" },
        {
          style: "destructive",
          text: "Supprimer",
          onPress: async () => {
            try {
              await deckService.removeDeck(deck.id);
              toast.showSuccess("Deck supprimé avec succès.");
              router.back();
            } catch (err) {
              toast.showError(getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  // Group cards for categories
  const mainCards = useMemo(() => deck?.cards?.filter((c) => c.role === "main") || [], [deck]);
  const sideCards = useMemo(() => deck?.cards?.filter((c) => c.role === "side") || [], [deck]);

  const pokemonCards = useMemo(
    () => deck?.cards?.filter((c) => normalizeCategory(c.card?.category) === "pokemon") || [],
    [deck],
  );
  const trainerCards = useMemo(
    () => deck?.cards?.filter((c) => normalizeCategory(c.card?.category) === "trainer") || [],
    [deck],
  );
  const energyCards = useMemo(
    () => deck?.cards?.filter((c) => normalizeCategory(c.card?.category) === "energy") || [],
    [deck],
  );
  const otherCards = useMemo(
    () =>
      deck?.cards?.filter((c) => {
        const cat = normalizeCategory(c.card?.category);
        return cat !== "pokemon" && cat !== "trainer" && cat !== "energy";
      }) || [],
    [deck],
  );

  const stats = useMemo(() => {
    const total = deck?.cards?.reduce((acc, c) => acc + c.qty, 0) || 0;
    const pokemon = pokemonCards.reduce((acc, c) => acc + c.qty, 0);
    const trainer = trainerCards.reduce((acc, c) => acc + c.qty, 0);
    const energy = energyCards.reduce((acc, c) => acc + c.qty, 0);
    return { total, pokemon, trainer, energy };
  }, [deck, pokemonCards, trainerCards, energyCards]);

  if (isLoading || !deck) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Chargement du deck...</Text>
      </View>
    );
  }

  const renderCardRow = (deckCard: DeckCard) => {
    const card = deckCard.card;
    return (
      <Pressable
        key={deckCard.id || card?.id}
        onPress={() => {
          if (card) {
            setSelectedCard(card);
            setIsCardModalVisible(true);
          }
        }}
        style={({ pressed }) => [styles.cardRowItem, pressed && styles.cardRowItemPressed]}
      >
        <View style={styles.cardMiniImageContainer}>
          {card?.image ? (
            <Image
              source={{ uri: getCardImage(card.image, "low") }}
              style={styles.cardMiniImage}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="image-outline" size={16} color="#cccccc" />
          )}
        </View>
        <View style={styles.cardInfoCol}>
          <Text numberOfLines={1} style={styles.cardNameText}>
            {card?.name || "Carte inconnue"}
          </Text>
          <Text numberOfLines={1} style={styles.cardSetText}>
            {card?.set?.name || "Set inconnu"} • {card?.rarity || "Rareté inconnue"}
          </Text>
        </View>
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>x{deckCard.qty}</Text>
        </View>
      </Pressable>
    );
  };

  const renderCardGridItem = (deckCard: DeckCard) => {
    const card = deckCard.card;
    return (
      <Pressable
        key={deckCard.id || card?.id}
        onPress={() => {
          if (card) {
            setSelectedCard(card);
            setIsCardModalVisible(true);
          }
        }}
        style={({ pressed }) => [styles.gridCardItem, pressed && styles.cardRowItemPressed]}
      >
        <View style={styles.gridImageContainer}>
          {card?.image ? (
            <Image
              source={{ uri: getCardImage(card.image, "low") }}
              style={styles.gridImage}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="image-outline" size={32} color="#cccccc" />
          )}
          <View style={styles.gridQtyBadge}>
            <Text style={styles.gridQtyText}>x{deckCard.qty}</Text>
          </View>
        </View>
        <View style={styles.gridCardDetails}>
          <Text numberOfLines={1} style={styles.gridCardTitle}>
            {card?.name || "Carte"}
          </Text>
          <Text numberOfLines={1} style={styles.gridCardSubtitle}>
            {card?.set?.name || "Inconnu"}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation back */}
        <View style={styles.navHeader}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            <Text style={styles.backBtnText}>Decks</Text>
          </Pressable>

          {!isOwner && (
            <Pressable
              disabled={isSavedPending}
              onPress={() => void handleToggleSave()}
              style={({ pressed }) => [styles.bookmarkBtn, pressed && styles.backBtnPressed]}
            >
              {isSavedPending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={colors.primary}
                />
              )}
            </Pressable>
          )}
        </View>

        {/* Deck Header Info */}
        <View style={styles.deckInfoCard}>
          <View style={styles.formatRow}>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{deck.format?.type || "Standard"}</Text>
            </View>
            <View style={styles.viewsBadge}>
              <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
              <Text style={styles.viewsText}>{deck.views || 0} vues</Text>
            </View>
          </View>
          <Text style={styles.deckTitle}>{deck.name}</Text>
          <Text style={styles.deckAuthor}>
            Créé par <Text style={styles.authorBold}>{deck.user?.firstName || "Anonyme"}</Text> le{" "}
            {new Date(deck.createdAt).toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {isOwner ? (
              <>
                <Pressable
                  onPress={() => router.push(`/decks/create?id=${deck.id}`)}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Modifier</Text>
                </Pressable>
                <Pressable
                  onPress={handleDeleteDeck}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionDeleteBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, styles.actionDeleteText]}>Supprimer</Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              onPress={() => void handleShareDeck()}
              disabled={isSharePending}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              {isSharePending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={16} color={colors.secondary} />
                  <Text style={[styles.actionBtnText, { color: colors.secondary }]}>Partager</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => void handleExportJson()}
              disabled={isExportPending}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              {isExportPending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="code-working" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>JSON</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsPanel}>
          <Text style={styles.panelTitle}>Statistiques du Deck</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Cartes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.pokemon}</Text>
              <Text style={styles.statLabel}>Pokémon</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.trainer}</Text>
              <Text style={styles.statLabel}>Dresseurs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.energy}</Text>
              <Text style={styles.statLabel}>Énergies</Text>
            </View>
          </View>
        </View>

        {/* Cards Tabs List (Main / Side) */}
        <View style={styles.tabsContainer}>
          <Pressable
            onPress={() => setActiveTab("main")}
            style={[styles.tabButton, activeTab === "main" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === "main" && styles.tabButtonTextActive]}>
              Principal ({mainCards.reduce((acc, c) => acc + c.qty, 0)})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("side")}
            style={[styles.tabButton, activeTab === "side" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === "side" && styles.tabButtonTextActive]}>
              Side ({sideCards.reduce((acc, c) => acc + c.qty, 0)})
            </Text>
          </Pressable>
        </View>

        {activeTab === "main" ? (
          mainCards.length > 0 ? (
            <View style={styles.gridContainer}>
              {mainCards.map(renderCardGridItem)}
            </View>
          ) : (
            <Text style={styles.emptyDeckLabel}>Aucune carte principale.</Text>
          )
        ) : (
          sideCards.length > 0 ? (
            <View style={styles.gridContainer}>
              {sideCards.map(renderCardGridItem)}
            </View>
          ) : (
            <Text style={styles.emptyDeckLabel}>Aucune carte side.</Text>
          )
        )}

        {/* Grouped Lists (Pokemon, Trainer, Energy) */}
        {pokemonCards.length > 0 && (
          <View style={styles.sectionPanel}>
            <View style={styles.sectionPanelHeader}>
              <Text style={styles.panelTitle}>Pokémon</Text>
              <View style={styles.panelBadge}>
                <Text style={styles.panelBadgeText}>
                  {pokemonCards.reduce((acc, c) => acc + c.qty, 0)}
                </Text>
              </View>
            </View>
            <View style={styles.rowsList}>{pokemonCards.map(renderCardRow)}</View>
          </View>
        )}

        {trainerCards.length > 0 && (
          <View style={styles.sectionPanel}>
            <View style={styles.sectionPanelHeader}>
              <Text style={styles.panelTitle}>Dresseurs</Text>
              <View style={styles.panelBadge}>
                <Text style={styles.panelBadgeText}>
                  {trainerCards.reduce((acc, c) => acc + c.qty, 0)}
                </Text>
              </View>
            </View>
            <View style={styles.rowsList}>{trainerCards.map(renderCardRow)}</View>
          </View>
        )}

        {energyCards.length > 0 && (
          <View style={styles.sectionPanel}>
            <View style={styles.sectionPanelHeader}>
              <Text style={styles.panelTitle}>Énergies</Text>
              <View style={styles.panelBadge}>
                <Text style={styles.panelBadgeText}>
                  {energyCards.reduce((acc, c) => acc + c.qty, 0)}
                </Text>
              </View>
            </View>
            <View style={styles.rowsList}>{energyCards.map(renderCardRow)}</View>
          </View>
        )}

        {otherCards.length > 0 && (
          <View style={styles.sectionPanel}>
            <View style={styles.sectionPanelHeader}>
              <Text style={styles.panelTitle}>Autres</Text>
              <View style={styles.panelBadge}>
                <Text style={styles.panelBadgeText}>
                  {otherCards.reduce((acc, c) => acc + c.qty, 0)}
                </Text>
              </View>
            </View>
            <View style={styles.rowsList}>{otherCards.map(renderCardRow)}</View>
          </View>
        )}

        {/* AI Analysis Section */}
        <View style={styles.analysisPanel}>
          <View style={styles.analysisHeader}>
            <Ionicons name="analytics" size={22} color={colors.primary} />
            <Text style={styles.analysisTitle}>Analyse du Deck</Text>
          </View>

          {analysis ? (
            <View style={styles.analysisResults}>
              <View style={styles.ratioRow}>
                <Text style={styles.ratioText}>
                  Ratio Énergies/Pokémon : <Text style={styles.boldText}>{analysis.energyToPokemonRatio.toFixed(2)}</Text>
                </Text>
                <Text style={styles.ratioText}>
                  Coût moyen d'attaque : <Text style={styles.boldText}>{analysis.averageEnergyCost.toFixed(1)} éner.</Text>
                </Text>
              </View>

              {analysis.warnings.length > 0 && (
                <View style={[styles.alertBox, styles.alertWarning]}>
                  <Ionicons name="warning-outline" size={16} color={colors.warning} style={styles.alertIcon} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitleText}>Avertissements</Text>
                    {analysis.warnings.map((w, index) => (
                      <Text key={`warn-${index}`} style={styles.alertDescText}>• {w}</Text>
                    ))}
                  </View>
                </View>
              )}

              {analysis.suggestions.length > 0 && (
                <View style={[styles.alertBox, styles.alertInfo]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.secondary} style={styles.alertIcon} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitleText}>Suggestions d'amélioration</Text>
                    {analysis.suggestions.map((s, index) => (
                      <Text key={`sug-${index}`} style={styles.alertDescText}>• {s}</Text>
                    ))}
                  </View>
                </View>
              )}

              {analysis.duplicates.length > 0 && (
                <View style={styles.duplicatesSection}>
                  <Text style={styles.duplicatesTitle}>Infractions aux limites de copies (Max 4)</Text>
                  {analysis.duplicates.map((d, index) => (
                    <View key={`dup-${index}`} style={styles.duplicateRow}>
                      <Text style={styles.dupName}>{d.cardName}</Text>
                      <Text style={styles.dupQty}>{d.qty} copies</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.analysisPlaceholder}>
              <Text style={styles.analysisPlaceholderText}>
                Obtenez une analyse AI statistique et des conseils stratégiques pour optimiser ce deck.
              </Text>
              <Pressable
                disabled={isAnalysisPending}
                onPress={() => void handleAnalyzeDeck()}
                style={({ pressed }) => [styles.analyzeBtn, pressed && styles.backBtnPressed]}
              >
                {isAnalysisPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#ffffff" />
                    <Text style={styles.analyzeBtnText}>Analyser le deck</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Share Dialog */}
      <Modal
        animationType="fade"
        transparent
        visible={shareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Code de partage généré</Text>
            <Text style={styles.modalDescription}>
              Partagez ce code avec d'autres dresseurs pour qu'ils puissent importer ce deck dans leur application.
            </Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{shareCode}</Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShareModalVisible(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Fermer</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleNativeShareCode()}
                style={[styles.modalButton, styles.modalButtonConfirm]}
              >
                <Ionicons name="share-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.modalButtonConfirmText}>Partager</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* JSON Export Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={exportModalVisible}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Données JSON du Deck</Text>
            <ScrollView style={styles.jsonScrollView}>
              <Text style={styles.jsonText}>{jsonExport}</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setExportModalVisible(false)}
                style={[styles.modalButton, styles.modalButtonCancel, { flex: 1 }]}
              >
                <Text style={styles.modalButtonCancelText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Card detail view modal */}
      <CardDetailModal
        card={selectedCard}
        isVisible={isCardModalVisible}
        onClose={() => setIsCardModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    paddingVertical: 8,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  actionDeleteBtn: {
    borderColor: colors.destructive,
  },
  actionDeleteText: {
    color: colors.destructive,
  },
  actionsRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
  },
  alertBox: {
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    marginVertical: 6,
    padding: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertDescText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  alertIcon: {
    marginTop: 2,
  },
  alertInfo: {
    backgroundColor: colors.accent,
  },
  alertTitleText: {
    fontSize: 13,
    fontWeight: "800",
  },
  alertWarning: {
    backgroundColor: "#fffdf0",
  },
  analysisHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  analysisPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  analysisPlaceholder: {
    alignItems: "center",
    paddingVertical: 12,
  },
  analysisPlaceholderText: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    textAlign: "center",
  },
  analysisResults: {
    gap: 8,
  },
  analysisTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  analyzeBtn: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  analyzeBtnText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: "700",
  },
  authorBold: {
    fontWeight: "700",
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
    fontSize: 16,
    fontWeight: "700",
  },
  boldText: {
    fontWeight: "800",
  },
  bookmarkBtn: {
    padding: 6,
  },
  cardInfoCol: {
    flex: 1,
    paddingHorizontal: 12,
  },
  cardMiniImage: {
    height: "100%",
    width: "100%",
  },
  cardMiniImageContainer: {
    aspectRatio: 0.71,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cardNameText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  cardRowItem: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 10,
  },
  cardRowItemPressed: {
    opacity: 0.7,
  },
  cardSetText: {
    color: colors.mutedForeground,
    fontSize: 10,
    marginTop: 2,
  },
  codeContainer: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    marginVertical: 14,
    paddingVertical: 12,
    width: "100%",
  },
  codeText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 2,
  },
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  deckAuthor: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 4,
  },
  deckInfoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  deckTitle: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  dupName: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: "600",
  },
  dupQty: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: "800",
  },
  duplicateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  duplicatesSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  duplicatesTitle: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyDeckLabel: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 12,
    textAlign: "center",
  },
  formatBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  formatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formatText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  gridCardDetails: {
    padding: 6,
  },
  gridCardSubtitle: {
    color: colors.mutedForeground,
    fontSize: 9,
  },
  gridCardTitle: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: "700",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 10,
  },
  gridImage: {
    height: "100%",
    width: "100%",
  },
  gridImageContainer: {
    aspectRatio: 0.71,
    backgroundColor: colors.surfaceMuted,
    width: "100%",
  },
  gridQtyBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 6,
  },
  gridQtyText: {
    color: colors.primaryForeground,
    fontSize: 10,
    fontWeight: "700",
  },
  gridCardItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    width: "31.5%",
  },
  jsonScrollView: {
    backgroundColor: "#2e2e2e",
    borderRadius: radius.md,
    marginTop: 10,
    maxHeight: 300,
    padding: 12,
    width: "100%",
  },
  jsonText: {
    color: "#a4a4a4",
    fontFamily: "Courier",
    fontSize: 11,
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
    flexDirection: "row",
  },
  modalButtonConfirmText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: "700",
  },
  modalContent: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    width: "100%",
  },
  modalDescription: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: "center",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  navHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  panelBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  panelBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  panelTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qtyBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "800",
  },
  ratioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ratioText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  rowsList: {
    marginTop: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  sectionPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    marginTop: 2,
  },
  statNumber: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    marginTop: 12,
  },
  statsPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  tabButton: {
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: 10,
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  tabsContainer: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginTop: 20,
  },
  viewsBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  viewsText: {
    color: colors.mutedForeground,
    fontSize: 11,
  },
});
