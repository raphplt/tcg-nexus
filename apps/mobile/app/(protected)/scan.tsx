import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthProvider";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { ocrService } from "@/services/ocr.service";
import { toast } from "@/store/useToastStore";
import type {
  CardSearchResult,
  OcrParsedResult,
  ScanHistoryItem,
  UserCollection,
} from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";

type ScanMode = "camera" | "review";

const HISTORY_LIMIT = 8;

const getHistoryColor = (status: ScanHistoryItem["status"]) => {
  switch (status) {
    case "added":
      return "#1c7b58";
    case "found":
      return "#244f80";
    case "not-found":
      return "#9f6112";
    default:
      return "#7a1f1f";
  }
};

const buildHistoryId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();

  const [mode, setMode] = useState<ScanMode>("camera");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [burstMode, setBurstMode] = useState(false);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [optimizedUri, setOptimizedUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrParsedResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(
    null,
  );
  const [candidateCards, setCandidateCards] = useState<CardSearchResult[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<CardSearchResult[]>([]);
  const [searchedTerms, setSearchedTerms] = useState<string[]>([]);

  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const selectedCollection = useMemo(
    () =>
      collections.find((collection) => collection.id === selectedCollectionId),
    [collections, selectedCollectionId],
  );

  const pushHistory = (entry: Omit<ScanHistoryItem, "id" | "createdAt">) => {
    setHistory((prev) =>
      [
        {
          ...entry,
          id: buildHistoryId(),
          createdAt: Date.now(),
        },
        ...prev,
      ].slice(0, HISTORY_LIMIT),
    );
  };

  const loadCollections = async () => {
    if (!user?.id) {
      setCollections([]);
      setSelectedCollectionId(null);
      setIsLoadingCollections(false);
      return;
    }

    setIsLoadingCollections(true);

    try {
      const data = await collectionService.getUserCollections(user.id);
      setCollections(data);
      setSelectedCollectionId((current) => current || data[0]?.id || null);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setInlineError(message);
      pushHistory({
        message,
        status: "error",
        title: "Collections",
      });
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => {
    void loadCollections();
  }, [user?.id]);

  const resetForNextCapture = () => {
    setMode("camera");
    setCapturedUri(null);
    setOptimizedUri(null);
    setOcrResult(null);
    setSelectedCard(null);
    setCandidateCards([]);
    setManualQuery("");
    setManualResults([]);
    setSearchedTerms([]);
    setInlineError(null);
  };

  const captureCard = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    setInlineError(null);
    setManualResults([]);
    setManualQuery("");
    setIsProcessing(true);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!picture?.uri) {
        throw new Error(
          "Capture impossible. Reessaie dans une zone bien eclairee.",
        );
      }

      setCapturedUri(picture.uri);

      const optimized = await ocrService.optimizeImage(picture.uri);
      setOptimizedUri(optimized.optimizedUri);

      const extracted = await ocrService.readCardText(optimized.base64);
      setOcrResult(extracted);

      const resolution = await cardService.resolveCardFromOcr(extracted);
      setCandidateCards(resolution.candidates);
      setSelectedCard(resolution.bestCard);
      setSearchedTerms(resolution.searchedTerms);

      if (resolution.bestCard) {
        pushHistory({
          message:
            resolution.bestCard.name || "Carte identifiee automatiquement",
          status: "found",
          title: "Carte reconnue",
        });
      } else {
        pushHistory({
          message:
            "Aucune correspondance automatique. Lance une recherche manuelle.",
          status: "not-found",
          title: "Carte non reconnue",
        });
      }

      setMode("review");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setInlineError(message);
      pushHistory({
        message,
        status: "error",
        title: "Erreur scan",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const runManualSearch = async () => {
    const query = manualQuery.trim();
    if (!query || isManualSearching) {
      return;
    }

    setInlineError(null);
    setIsManualSearching(true);

    try {
      const cards = await cardService.searchCards(query);
      setManualResults(cards);

      if (cards.length === 0) {
        setInlineError("Aucune carte trouvee pour cette recherche.");
      }
    } catch (error) {
      setInlineError(getApiErrorMessage(error));
    } finally {
      setIsManualSearching(false);
    }
  };

  const ensureTargetCollection = async (): Promise<string> => {
    if (selectedCollectionId) {
      return selectedCollectionId;
    }

    if (collections[0]?.id) {
      setSelectedCollectionId(collections[0].id);
      return collections[0].id;
    }

    if (!user?.id) {
      throw new Error(
        "Utilisateur non connecte. Impossible de creer une collection.",
      );
    }

    const created = await collectionService.createCollection({
      name: "Scans rapides",
      description: "Collection creee automatiquement depuis le scan mobile.",
      isPublic: false,
      userId: user.id,
    });

    setCollections((prev) => [created, ...prev]);
    setSelectedCollectionId(created.id);
    return created.id;
  };

  const addCardToCollection = async () => {
    if (!selectedCard || isSaving) {
      setInlineError("Selectionne une carte avant l'ajout.");
      return;
    }

    setIsSaving(true);
    setInlineError(null);

    try {
      const collectionId = await ensureTargetCollection();
      const item = await collectionService.addCardToCollection(
        collectionId,
        selectedCard.id,
      );

      const quantity = Number(item.quantity || 1);
      const successMessage =
        quantity > 1
          ? `${selectedCard.name || "Carte"} deja presente, quantite incrementee (${quantity}).`
          : `${selectedCard.name || "Carte"} ajoutee a ${selectedCollection?.name || "la collection"}.`;

      toast.showSuccess(successMessage);
      pushHistory({
        message: successMessage,
        status: "added",
        title: "Ajout collection",
      });

      if (burstMode) {
        resetForNextCapture();
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      setInlineError(message);
      pushHistory({
        message,
        status: "error",
        title: "Ajout impossible",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator color="#15233b" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>Camera requise</Text>
        <Text style={styles.permissionText}>
          Le scan OCR a besoin de la camera pour capturer la carte.
        </Text>
        <Pressable
          onPress={() => void requestPermission()}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Autoriser la camera</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={styles.permissionSecondaryButton}
        >
          <Text style={styles.permissionSecondaryText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (mode === "camera") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          facing="back"
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.cameraTopBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons color="#fff" name="arrow-back" size={22} />
          </Pressable>

          <View style={styles.burstBadge}>
            <Text style={styles.burstText}>Rafale</Text>
            <Switch
              onValueChange={setBurstMode}
              trackColor={{ false: "#667086", true: "#d95f4d" }}
              value={burstMode}
            />
          </View>
        </View>

        <View style={styles.scanFrame} />

        <View
          style={[
            styles.cameraBottomBar,
            { paddingBottom: insets.bottom + 18 },
          ]}
        >
          <Pressable
            disabled={isProcessing}
            onPress={() => {
              void captureCard();
            }}
            style={({ pressed }) => [
              styles.captureButton,
              (pressed || isProcessing) && styles.captureButtonPressed,
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color="#f7f1e8" />
            ) : (
              <Ionicons color="#f7f1e8" name="camera" size={28} />
            )}
          </Pressable>

          <Text style={styles.captureHint}>
            Place la carte dans le cadre puis capture.
          </Text>
        </View>

        <View style={[styles.historyOverlay, { bottom: insets.bottom + 120 }]}>
          {inlineError ? (
            <Text style={styles.inlineError}>{inlineError}</Text>
          ) : null}
          {history.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View
                style={[
                  styles.historyDot,
                  { backgroundColor: getHistoryColor(entry.status) },
                ]}
              />
              <Text numberOfLines={1} style={styles.historyText}>
                {entry.title} - {entry.message}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.reviewScreen}
    >
      <ScrollView
        contentContainerStyle={styles.reviewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.reviewHeader}>
          <Pressable onPress={resetForNextCapture} style={styles.lightButton}>
            <Ionicons color="#15233b" name="camera-reverse" size={18} />
            <Text style={styles.lightButtonText}>Rescanner</Text>
          </Pressable>

          <View style={styles.burstInlineRow}>
            <Text style={styles.burstInlineText}>Mode rafale</Text>
            <Switch
              onValueChange={setBurstMode}
              trackColor={{ false: "#d7dce5", true: "#d95f4d" }}
              value={burstMode}
            />
          </View>
        </View>

        <View style={styles.compareCard}>
          <Text style={styles.sectionTitle}>Confirmation visuelle</Text>
          <View style={styles.compareRow}>
            <View style={styles.compareColumn}>
              <Text style={styles.compareLabel}>Scan</Text>
              {optimizedUri || capturedUri ? (
                <Image
                  source={{ uri: optimizedUri || capturedUri || undefined }}
                  style={styles.scanPreview}
                />
              ) : (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>Image indisponible</Text>
                </View>
              )}
            </View>

            <View style={styles.compareColumn}>
              <Text style={styles.compareLabel}>Carte trouvee (BDD)</Text>
              {selectedCard?.image ? (
                <Image
                  source={{ uri: selectedCard.image }}
                  style={styles.scanPreview}
                />
              ) : (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>
                    Aucune carte correspondante
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.ocrMeta}>
            OCR: {ocrResult?.cardName || "nom inconnu"}
            {ocrResult?.setCode ? ` • ${ocrResult.setCode}` : ""}
            {ocrResult?.setName ? ` • ${ocrResult.setName}` : ""}
          </Text>
          {searchedTerms.length > 0 ? (
            <Text style={styles.ocrMeta}>
              Recherches: {searchedTerms.join(" | ")}
            </Text>
          ) : null}
        </View>

        <View style={styles.blockCard}>
          <Text style={styles.sectionTitle}>Correction manuelle</Text>
          <View style={styles.searchRow}>
            <TextInput
              autoCapitalize="none"
              onChangeText={setManualQuery}
              placeholder="Nom de carte, set ou numero"
              placeholderTextColor="#8b92a1"
              style={styles.searchInput}
              value={manualQuery}
            />
            <Pressable
              disabled={isManualSearching}
              onPress={() => {
                void runManualSearch();
              }}
              style={({ pressed }) => [
                styles.searchButton,
                (pressed || isManualSearching) && styles.searchButtonPressed,
              ]}
            >
              {isManualSearching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons color="#fff" name="search" size={16} />
              )}
            </Pressable>
          </View>

          {manualResults.length > 0 ? (
            <View style={styles.resultList}>
              {manualResults.slice(0, 6).map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => {
                    setSelectedCard(card);
                    setInlineError(null);
                  }}
                  style={({ pressed }) => [
                    styles.resultRow,
                    selectedCard?.id === card.id && styles.resultRowSelected,
                    pressed && styles.resultRowPressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.resultTitle}>
                    {card.name || "Carte sans nom"}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {card.localId ? `#${card.localId}` : "-"}
                    {card.set?.name ? ` • ${card.set.name}` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.blockCard}>
          <Text style={styles.sectionTitle}>Collection cible</Text>
          {isLoadingCollections ? (
            <ActivityIndicator color="#15233b" />
          ) : (
            <View style={styles.collectionWrap}>
              {collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  onPress={() => setSelectedCollectionId(collection.id)}
                  style={({ pressed }) => [
                    styles.collectionChip,
                    selectedCollectionId === collection.id &&
                      styles.collectionChipActive,
                    pressed && styles.collectionChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.collectionChipText,
                      selectedCollectionId === collection.id &&
                        styles.collectionChipTextActive,
                    ]}
                  >
                    {collection.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            disabled={isSaving || !selectedCard}
            onPress={() => {
              void addCardToCollection();
            }}
            style={({ pressed }) => [
              styles.addButton,
              (pressed || isSaving || !selectedCard) && styles.addButtonPressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff8f3" />
            ) : (
              <Text style={styles.addButtonText}>
                {selectedCard
                  ? "Ajouter a la collection"
                  : "Selectionne une carte"}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.blockCard}>
          <Text style={styles.sectionTitle}>Historique session</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Aucun scan pour le moment.</Text>
          ) : (
            history.map((entry) => (
              <View key={entry.id} style={styles.historyListRow}>
                <View
                  style={[
                    styles.historyDot,
                    { backgroundColor: getHistoryColor(entry.status) },
                  ]}
                />
                <View style={styles.historyListContent}>
                  <Text style={styles.historyListTitle}>{entry.title}</Text>
                  <Text style={styles.historyListText}>{entry.message}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {inlineError ? (
          <Text style={styles.inlineErrorPanel}>{inlineError}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    color: "#fff8f3",
    fontSize: 15,
    fontWeight: "800",
  },
  blockCard: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  burstBadge: {
    alignItems: "center",
    backgroundColor: "rgba(21,35,59,0.6)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  burstInlineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  burstInlineText: {
    color: "#15233b",
    fontSize: 13,
    fontWeight: "700",
  },
  burstText: {
    color: "#fff8f3",
    fontSize: 12,
    fontWeight: "700",
  },
  cameraBottomBar: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  cameraContainer: {
    backgroundColor: "#000",
    flex: 1,
  },
  cameraTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 16,
    position: "absolute",
    right: 16,
    top: 0,
  },
  captureButton: {
    alignItems: "center",
    backgroundColor: "rgba(21,35,59,0.85)",
    borderColor: "#f7f1e8",
    borderRadius: 34,
    borderWidth: 2,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  captureButtonPressed: {
    opacity: 0.7,
  },
  captureHint: {
    color: "#fff8f3",
    fontSize: 13,
    marginTop: 10,
  },
  centeredScreen: {
    alignItems: "center",
    backgroundColor: "#f7f1e8",
    flex: 1,
    justifyContent: "center",
  },
  collectionChip: {
    backgroundColor: "#f3f1ed",
    borderColor: "#ded8d0",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectionChipActive: {
    backgroundColor: "#15233b",
    borderColor: "#15233b",
  },
  collectionChipPressed: {
    opacity: 0.8,
  },
  collectionChipText: {
    color: "#2b3340",
    fontSize: 13,
    fontWeight: "700",
  },
  collectionChipTextActive: {
    color: "#fff8f3",
  },
  collectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compareCard: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  compareColumn: {
    flex: 1,
    gap: 8,
  },
  compareLabel: {
    color: "#7c6a58",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  compareRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },
  historyDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  historyListContent: {
    flex: 1,
    gap: 2,
  },
  historyListRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  historyListText: {
    color: "#5d6776",
    fontSize: 13,
  },
  historyListTitle: {
    color: "#15233b",
    fontSize: 14,
    fontWeight: "700",
  },
  historyOverlay: {
    backgroundColor: "rgba(11,18,31,0.72)",
    borderRadius: 14,
    left: 16,
    padding: 10,
    position: "absolute",
    right: 16,
  },
  historyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  historyText: {
    color: "#f5f7fa",
    flex: 1,
    fontSize: 12,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(21,35,59,0.65)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  inlineError: {
    color: "#ffbdbd",
    fontSize: 12,
    marginBottom: 6,
  },
  inlineErrorPanel: {
    color: "#9f2c2c",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
  },
  lightButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#dbe0ea",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lightButtonText: {
    color: "#15233b",
    fontSize: 13,
    fontWeight: "700",
  },
  ocrMeta: {
    color: "#4e5968",
    fontSize: 12,
    marginTop: 8,
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  permissionButtonText: {
    color: "#fff8f3",
    fontSize: 15,
    fontWeight: "700",
  },
  permissionScreen: {
    alignItems: "center",
    backgroundColor: "#f7f1e8",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  permissionSecondaryButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  permissionSecondaryText: {
    color: "#15233b",
    fontWeight: "700",
  },
  permissionText: {
    color: "#5d6776",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  permissionTitle: {
    color: "#15233b",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  placeholderBox: {
    alignItems: "center",
    backgroundColor: "#f0f2f7",
    borderColor: "#d3dae9",
    borderRadius: 12,
    borderWidth: 1,
    height: 160,
    justifyContent: "center",
  },
  placeholderText: {
    color: "#6a7382",
    fontSize: 13,
    textAlign: "center",
  },
  resultList: {
    gap: 8,
    marginTop: 12,
  },
  resultMeta: {
    color: "#6a7382",
    fontSize: 12,
  },
  resultRow: {
    backgroundColor: "#f7f8fb",
    borderColor: "#dfe4ef",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resultRowPressed: {
    opacity: 0.85,
  },
  resultRowSelected: {
    backgroundColor: "#e8f0fb",
    borderColor: "#8caed8",
  },
  resultTitle: {
    color: "#15233b",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reviewScreen: {
    backgroundColor: "#f7f1e8",
    flex: 1,
  },
  scanFrame: {
    borderColor: "rgba(247,241,232,0.9)",
    borderRadius: 20,
    borderWidth: 2,
    height: "52%",
    left: 24,
    position: "absolute",
    right: 24,
    top: "20%",
  },
  scanPreview: {
    borderRadius: 12,
    height: 160,
    resizeMode: "cover",
    width: "100%",
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  searchButtonPressed: {
    opacity: 0.75,
  },
  searchInput: {
    backgroundColor: "#f6f7fa",
    borderColor: "#dbe1ec",
    borderRadius: 12,
    borderWidth: 1,
    color: "#15233b",
    flex: 1,
    fontSize: 15,
    height: 44,
    paddingHorizontal: 12,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  sectionTitle: {
    color: "#15233b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
});
