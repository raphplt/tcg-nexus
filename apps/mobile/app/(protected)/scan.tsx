import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthProvider";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { ocrService } from "@/services/ocr.service";
import { scanService } from "@/services/scan.service";
import { toast } from "@/store/useToastStore";
import type {
  CardSearchResult,
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanHistoryItem,
  ScanParsedFields,
  UserCollection,
} from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";

//TODO : à refactoriser dans plusieurs fichiers

const candidateToCard = (candidate: ScanCardCandidate): CardSearchResult => ({
  id: candidate.id,
  name: candidate.name,
  image: candidate.image,
  localId: candidate.localId,
  rarity: candidate.rarity,
  set: candidate.setName ? { name: candidate.setName } : undefined,
});

// affichage selon le niveau de confiance renvoyé par le backend
const CONFIDENCE_META: Record<
  ScanConfidenceLevel,
  {
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    hint: string;
  }
> = {
  high: {
    color: "#3a9742",
    icon: "checkmark-circle",
    label: "Confiance élevée",
    hint: "Carte reconnue, prête à être ajoutée.",
  },
  medium: {
    color: "#e49e22",
    icon: "help-circle",
    label: "À confirmer",
    hint: "Vérifie la carte parmi les candidats proposés.",
  },
  low: {
    color: "#da2b29",
    icon: "alert-circle",
    label: "Reconnaissance incertaine",
    hint: "Aucune correspondance fiable, fais une recherche manuelle.",
  },
};

const CARD_RATIO = 63 / 88; // largeur / hauteur d'une carte Pokémon

// overlay affiché pendant l'analyse : photo figée + ligne de scan animée
function ProcessingOverlay({ uri }: { uri: string | null }) {
  const { height } = useWindowDimensions();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateY = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height],
  });

  return (
    <View style={styles.processingScreen}>
      {uri ? (
        <Image
          blurRadius={3}
          resizeMode="cover"
          source={{ uri }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.processingDim} />
      <Animated.View
        style={[styles.scanLine, { transform: [{ translateY }] }]}
      />
      <View style={styles.processingInfo}>
        <ActivityIndicator color="#ffffff" size="large" />
        <Text style={styles.processingTitle}>Analyse de la carte…</Text>
      </View>
    </View>
  );
}

type ScanMode = "camera" | "review";

const HISTORY_LIMIT = 8;

const getHistoryColor = (status: ScanHistoryItem["status"]) => {
  switch (status) {
    case "added":
      return "#3a9742";
    case "found":
      return "#09597d";
    case "not-found":
      return "#e49e22";
    default:
      return "#da2b29";
  }
};

const buildHistoryId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();

  // cadre au ratio d'une carte, centré et un peu remonté (barre du bas)
  const frameW = Math.min(screenW * 0.84, 360);
  const frameH = frameW / CARD_RATIO;
  const frameTop = Math.max(insets.top + 70, (screenH - frameH) / 2 - 40);

  const [mode, setMode] = useState<ScanMode>("camera");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [burstMode, setBurstMode] = useState(false);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [optimizedUri, setOptimizedUri] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ScanParsedFields | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [confidenceLevel, setConfidenceLevel] =
    useState<ScanConfidenceLevel | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(
    null,
  );
  const [candidateCards, setCandidateCards] = useState<CardSearchResult[]>([]);
  const [showOtherMatches, setShowOtherMatches] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<CardSearchResult[]>([]);

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
    setParsed(null);
    setConfidence(0);
    setConfidenceLevel(null);
    setSelectedCard(null);
    setCandidateCards([]);
    setShowOtherMatches(false);
    setManualQuery("");
    setManualResults([]);
    setInlineError(null);
  };

  const captureCard = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    setInlineError(null);
    setManualResults([]);
    setManualQuery("");

    // 1) capture pendant que la caméra est encore montée
    let capturedImageUri: string;
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (!picture?.uri) {
        throw new Error("Capture impossible.");
      }
      capturedImageUri = picture.uri;
    } catch {
      setInlineError(
        "Capture impossible. Reessaie dans une zone bien eclairee.",
      );
      return;
    }

    setCapturedUri(capturedImageUri);

    // 2) seulement maintenant on bascule sur le loader (la caméra se démonte)
    setIsProcessing(true);

    try {
      const optimizedUri = await ocrService.optimizeImage(capturedImageUri);
      setOptimizedUri(optimizedUri);

      const result = await scanService.recognize(optimizedUri);
      setParsed(result.parsed);
      setConfidence(result.confidence);
      setConfidenceLevel(result.confidenceLevel);

      setCandidateCards(result.candidates.map(candidateToCard));
      const best = result.bestCard ? candidateToCard(result.bestCard) : null;
      setSelectedCard(best);

      // confiance haute en rafale : on ajoute direct et on repart sur la caméra
      if (result.confidenceLevel === "high" && best && burstMode) {
        await addCardToCollection(best);
        return;
      }

      if (result.bestCard) {
        pushHistory({
          message: result.bestCard.name || "Carte identifiee automatiquement",
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
      description: "Cartes ajoutées par scan.",
      isPublic: false,
      userId: user.id,
    });

    setCollections((prev) => [created, ...prev]);
    setSelectedCollectionId(created.id);
    return created.id;
  };

  const addCardToCollection = async (card?: CardSearchResult) => {
    const target = card ?? selectedCard;
    if (!target || isSaving) {
      setInlineError("Selectionne une carte avant l'ajout.");
      return;
    }

    setIsSaving(true);
    setInlineError(null);

    try {
      const collectionId = await ensureTargetCollection();
      const item = await collectionService.addCardToCollection(
        collectionId,
        target.id,
      );

      const quantity = Number(item.quantity || 1);
      const successMessage =
        quantity > 1
          ? `${target.name || "Carte"} deja presente, quantite incrementee (${quantity}).`
          : `${target.name || "Carte"} ajoutee a ${selectedCollection?.name || "la collection"}.`;

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

  const renderCardRow = (card: CardSearchResult) => {
    const isSelected = selectedCard?.id === card.id;
    return (
      <Pressable
        key={card.id}
        onPress={() => {
          setSelectedCard(card);
          setInlineError(null);
        }}
        style={({ pressed }) => [
          styles.resultRow,
          isSelected && styles.resultRowSelected,
          pressed && styles.resultRowPressed,
        ]}
      >
        {card.image ? (
          <Image source={{ uri: card.image }} style={styles.rowThumb} />
        ) : (
          <View style={[styles.rowThumb, styles.rowThumbEmpty]} />
        )}
        <View style={styles.resultText}>
          <Text numberOfLines={1} style={styles.resultTitle}>
            {card.name || "Carte sans nom"}
          </Text>
          <Text style={styles.resultMeta}>
            {card.localId ? `#${card.localId}` : "-"}
            {card.set?.name ? ` • ${card.set.name}` : ""}
          </Text>
        </View>
        {isSelected ? (
          <Ionicons color="#09597d" name="checkmark-circle" size={22} />
        ) : null}
      </Pressable>
    );
  };

  // pendant l'analyse : on ferme le scanner et on montre le loader transitoire
  if (isProcessing) {
    return <ProcessingOverlay uri={capturedUri} />;
  }

  if (!permission) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator color="#0b0b0b" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>Appareil photo requis</Text>
        <Text style={styles.permissionText}>
          Autorise l'appareil photo pour scanner tes cartes.
        </Text>
        <Pressable
          onPress={() => void requestPermission()}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>
            Autoriser l'appareil photo
          </Text>
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
            <Ionicons color="#ffffff" name="arrow-back" size={22} />
          </Pressable>

          <View style={styles.burstBadge}>
            <Text style={styles.burstText}>Rafale</Text>
            <Switch
              onValueChange={setBurstMode}
              trackColor={{ false: "#555555", true: "#b72921" }}
              value={burstMode}
            />
          </View>
        </View>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.mask, { height: frameTop }]} />
          <View style={{ flexDirection: "row", height: frameH }}>
            <View style={[styles.mask, { flex: 1 }]} />
            <View style={{ width: frameW, height: frameH }}>
              <View style={styles.frameBorder} />
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={[styles.mask, { flex: 1 }]} />
          </View>
          <View style={[styles.mask, { flex: 1 }]}>
            <Text style={styles.frameHint}>
              Aligne la carte dans le cadre, bien à plat
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.cameraBottomBar,
            { paddingBottom: insets.bottom + 18 },
          ]}
        >
          <Pressable
            onPress={() => {
              void captureCard();
            }}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
            ]}
          >
            <Ionicons color="#fcfcfc" name="camera" size={28} />
          </Pressable>

          <Text style={styles.captureHint}>
            Remplis bien le cadre puis capture
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
    <SafeAreaView edges={["top", "left", "right"]} style={styles.reviewScreen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.reviewContainer}
      >
        <ScrollView
          contentContainerStyle={styles.reviewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.reviewHeader}>
            <Pressable onPress={resetForNextCapture} style={styles.lightButton}>
              <Ionicons color="#0b0b0b" name="camera-reverse" size={18} />
              <Text style={styles.lightButtonText}>Rescanner</Text>
            </Pressable>

            <View style={styles.burstInlineRow}>
              <Text style={styles.burstInlineText}>Mode rafale</Text>
              <Switch
                onValueChange={setBurstMode}
                trackColor={{ false: "#e4e4e4", true: "#b72921" }}
                value={burstMode}
              />
            </View>
          </View>

          {confidenceLevel ? (
            <View
              style={[
                styles.confidenceBanner,
                { borderColor: CONFIDENCE_META[confidenceLevel].color },
              ]}
            >
              <Ionicons
                color={CONFIDENCE_META[confidenceLevel].color}
                name={CONFIDENCE_META[confidenceLevel].icon}
                size={22}
              />
              <View style={styles.confidenceTextWrap}>
                <Text
                  style={[
                    styles.confidenceLabel,
                    { color: CONFIDENCE_META[confidenceLevel].color },
                  ]}
                >
                  {CONFIDENCE_META[confidenceLevel].label} ·{" "}
                  {Math.round(confidence * 100)}%
                </Text>
                <Text style={styles.confidenceHint}>
                  {CONFIDENCE_META[confidenceLevel].hint}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.compareCard}>
            <Text style={styles.sectionTitle}>Vérification</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareColumn}>
                <Text style={styles.compareLabel}>Ta photo</Text>
                {optimizedUri || capturedUri ? (
                  <Image
                    source={{ uri: optimizedUri || capturedUri || undefined }}
                    style={styles.scanPreview}
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    <Text style={styles.placeholderText}>
                      Image indisponible
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.compareColumn}>
                <Text style={styles.compareLabel}>Carte trouvée</Text>
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

            {parsed?.cardName ? (
              <Text style={styles.ocrMeta}>
                Carte lue : {parsed.cardName}
                {parsed?.setName ? ` • ${parsed.setName}` : ""}
              </Text>
            ) : null}
          </View>

          {candidateCards.length > 0 && confidenceLevel === "high" ? (
            // confiance haute : on replie les autres correspondances
            <View style={styles.blockCard}>
              <Pressable
                onPress={() => setShowOtherMatches((v) => !v)}
                style={styles.toggleRow}
              >
                <Text style={styles.toggleText}>
                  Ce n'est pas la bonne carte ?
                </Text>
                <Ionicons
                  color="#555555"
                  name={showOtherMatches ? "chevron-up" : "chevron-down"}
                  size={18}
                />
              </Pressable>
              {showOtherMatches ? (
                <View style={styles.resultList}>
                  {candidateCards.slice(0, 6).map(renderCardRow)}
                </View>
              ) : null}
            </View>
          ) : null}

          {candidateCards.length > 0 && confidenceLevel !== "high" ? (
            // confiance moyenne/basse : comparer et choisir la bonne carte
            <View style={styles.blockCard}>
              <Text style={styles.sectionTitle}>Choisis la bonne carte</Text>
              <View style={styles.resultList}>
                {candidateCards.slice(0, 6).map(renderCardRow)}
              </View>
            </View>
          ) : null}

          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>Rechercher une autre carte</Text>
            <View style={styles.searchRow}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setManualQuery}
                placeholder="Nom de carte, set ou numero"
                placeholderTextColor="#555555"
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
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons color="#ffffff" name="search" size={16} />
                )}
              </Pressable>
            </View>

            {manualResults.length > 0 ? (
              <View style={styles.resultList}>
                {manualResults.slice(0, 6).map(renderCardRow)}
              </View>
            ) : null}
          </View>

          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>Ajouter à une collection</Text>
            {isLoadingCollections ? (
              <ActivityIndicator color="#0b0b0b" />
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
                (pressed || isSaving || !selectedCard) &&
                  styles.addButtonPressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
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
            <Text style={styles.sectionTitle}>Activité récente</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  confidenceBanner: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  confidenceTextWrap: {
    flex: 1,
    gap: 2,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  confidenceHint: {
    color: "#555555",
    fontSize: 12,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
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
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  blockCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  burstBadge: {
    alignItems: "center",
    backgroundColor: "rgba(11,11,11,0.6)",
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
    color: "#0b0b0b",
    fontSize: 13,
    fontWeight: "700",
  },
  burstText: {
    color: "#ffffff",
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
    backgroundColor: "rgba(11,11,11,0.85)",
    borderColor: "#fcfcfc",
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
    color: "#ffffff",
    fontSize: 13,
    marginTop: 10,
  },
  centeredScreen: {
    alignItems: "center",
    backgroundColor: "#fcfcfc",
    flex: 1,
    justifyContent: "center",
  },
  collectionChip: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectionChipActive: {
    backgroundColor: "#0b0b0b",
    borderColor: "#0b0b0b",
  },
  collectionChipPressed: {
    opacity: 0.8,
  },
  collectionChipText: {
    color: "#0b0b0b",
    fontSize: 13,
    fontWeight: "700",
  },
  collectionChipTextActive: {
    color: "#ffffff",
  },
  collectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compareCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e4",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  compareColumn: {
    flex: 1,
    gap: 8,
  },
  compareLabel: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  compareRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptyText: {
    color: "#555555",
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
    color: "#555555",
    fontSize: 13,
  },
  historyListTitle: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "700",
  },
  historyOverlay: {
    backgroundColor: "rgba(11,11,11,0.72)",
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
    color: "#f3f5f9",
    flex: 1,
    fontSize: 12,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(11,11,11,0.65)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  inlineError: {
    color: "#f4b4b3",
    fontSize: 12,
    marginBottom: 6,
  },
  inlineErrorPanel: {
    color: "#da2b29",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
  },
  lightButton: {
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
  lightButtonText: {
    color: "#0b0b0b",
    fontSize: 13,
    fontWeight: "700",
  },
  ocrMeta: {
    color: "#555555",
    fontSize: 12,
    marginTop: 8,
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  permissionScreen: {
    alignItems: "center",
    backgroundColor: "#fcfcfc",
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
    color: "#0b0b0b",
    fontWeight: "700",
  },
  permissionText: {
    color: "#555555",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  permissionTitle: {
    color: "#0b0b0b",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  placeholderBox: {
    alignItems: "center",
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    height: 160,
    justifyContent: "center",
  },
  placeholderText: {
    color: "#555555",
    fontSize: 13,
    textAlign: "center",
  },
  resultList: {
    gap: 8,
    marginTop: 12,
  },
  resultMeta: {
    color: "#555555",
    fontSize: 12,
  },
  resultRow: {
    alignItems: "center",
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resultRowPressed: {
    opacity: 0.85,
  },
  resultRowSelected: {
    backgroundColor: "#ecf3f8",
    borderColor: "#09597d",
  },
  resultText: {
    flex: 1,
  },
  rowThumb: {
    backgroundColor: "#e4e4e4",
    borderRadius: 6,
    height: 66,
    width: 47,
  },
  rowThumbEmpty: {
    borderColor: "#d0d0d0",
    borderWidth: 1,
  },
  resultTitle: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "700",
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  toggleText: {
    color: "#555555",
    fontSize: 14,
    fontWeight: "600",
  },
  reviewContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reviewContainer: {
    flex: 1,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reviewScreen: {
    backgroundColor: "#fcfcfc",
    flex: 1,
  },
  mask: {
    backgroundColor: "rgba(11,11,11,0.62)",
  },
  frameBorder: {
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 16,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  corner: {
    borderColor: "#ffffff",
    height: 30,
    position: "absolute",
    width: 30,
  },
  cornerTL: {
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
    borderTopWidth: 3,
    left: -1,
    top: -1,
  },
  cornerTR: {
    borderRightWidth: 3,
    borderTopRightRadius: 16,
    borderTopWidth: 3,
    right: -1,
    top: -1,
  },
  cornerBL: {
    borderBottomLeftRadius: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: -1,
    left: -1,
  },
  cornerBR: {
    borderBottomRightRadius: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: -1,
    right: -1,
  },
  frameHint: {
    color: "#f3f5f9",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
  },
  processingScreen: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    flex: 1,
    justifyContent: "center",
  },
  processingDim: {
    backgroundColor: "rgba(11,11,11,0.6)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scanLine: {
    backgroundColor: "#b72921",
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: "#b72921",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    top: 0,
  },
  processingInfo: {
    alignItems: "center",
    gap: 14,
  },
  processingTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  scanPreview: {
    borderRadius: 12,
    height: 160,
    resizeMode: "cover",
    width: "100%",
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  searchButtonPressed: {
    opacity: 0.75,
  },
  searchInput: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    color: "#0b0b0b",
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
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
});
