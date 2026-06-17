import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState, useMemo } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthProvider";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { cardResolver } from "@/services/scanner/card-resolver";
import { toast } from "@/store/useToastStore";
import { getApiErrorMessage } from "@/utils/apiError";
import type {
  CardSearchResult,
  ScanConfidence,
  ScanHistoryItem,
  UserCollection,
} from "@/types";
import type { RankedCandidate, ScanResolution } from "@/types/scanner";

// ─── Proportions carte Pokémon : 63mm × 88mm ────────────────────────────────
const CARD_ASPECT_H_W = 88 / 63; // hauteur/largeur ≈ 1.397
const FRAME_WIDTH_RATIO = 0.78;

type ScanMode = "camera" | "review";
const HISTORY_LIMIT = 8;

const confidenceColor = (c: ScanConfidence) =>
  c === "HIGH" ? "#16a34a" : c === "MEDIUM" ? "#d97706" : "#dc2626";

const confidenceLabel = (c: ScanConfidence) =>
  c === "HIGH" ? "Très fiable" : c === "MEDIUM" ? "Probable" : "Incertain";

const historyColor = (s: ScanHistoryItem["status"]) => {
  if (s === "added") return "#16a34a";
  if (s === "found") return "#2563eb";
  if (s === "not-found") return "#d97706";
  return "#dc2626";
};

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();

  // ── Dimensions du cadre ───────────────────────────────────────────────────
  const topBarH = insets.top + 56;
  const bottomBarH = insets.bottom + 120;
  const frameW = Math.floor(screenW * FRAME_WIDTH_RATIO);
  const frameH = Math.floor(frameW * CARD_ASPECT_H_W);
  const frameX = Math.floor((screenW - frameW) / 2);
  const availableH = screenH - topBarH - bottomBarH;
  const frameY = topBarH + Math.floor((availableH - frameH) / 2);

  // ── Animation ligne de scan ───────────────────────────────────────────────
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ScanMode>("camera");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [burstMode, setBurstMode] = useState(false);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [resolution, setResolution] = useState<ScanResolution | null>(null);
  const [selectedCard, setSelectedCard] = useState<RankedCandidate | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<CardSearchResult[]>([]);
  const [selectedManualCard, setSelectedManualCard] = useState<CardSearchResult | null>(null);

  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const selectedCollection = useMemo(
    () => collections.find((c) => c.id === selectedCollectionId),
    [collections, selectedCollectionId],
  );

  const confidence: ScanConfidence = (resolution?.confidence ?? "LOW") as ScanConfidence;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const pushHistory = (entry: Omit<ScanHistoryItem, "id" | "createdAt">) => {
    setHistory((prev) =>
      [{ ...entry, id: buildId(), createdAt: Date.now() }, ...prev].slice(0, HISTORY_LIMIT),
    );
  };

  const loadCollections = async () => {
    if (!user?.id) { setCollections([]); setSelectedCollectionId(null); setIsLoadingCollections(false); return; }
    setIsLoadingCollections(true);
    try {
      const data = await collectionService.getUserCollections(user.id);
      setCollections(data);
      setSelectedCollectionId((cur) => cur ?? data[0]?.id ?? null);
    } catch (e) {
      setInlineError(getApiErrorMessage(e));
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => { void loadCollections(); }, [user?.id]);

  const resetForNextCapture = () => {
    setMode("camera");
    setCapturedUri(null);
    setResolution(null);
    setSelectedCard(null);
    setManualQuery("");
    setManualResults([]);
    setSelectedManualCard(null);
    setInlineError(null);
  };

  // ── Capture ───────────────────────────────────────────────────────────────
  const captureCard = async () => {
    if (!cameraRef.current || isProcessing) return;
    setInlineError(null);
    setManualResults([]);
    setManualQuery("");
    setIsProcessing(true);

    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.92, skipProcessing: true });
      if (!picture?.uri) throw new Error("Capture impossible. Réessaie dans une zone bien éclairée.");

      setCapturedUri(picture.uri);

      const frameCrop = { frameX, frameY, frameW, frameH, screenW, screenH };
      const result = await cardResolver.resolve(picture.uri, frameCrop);
      setResolution(result);
      setSelectedCard(result.rankedCandidates[0] ?? null);

      if (result.bestCardId) {
        const conf = result.confidence as ScanConfidence;
        pushHistory({
          message: result.bestCardName ?? "Carte identifiée",
          status: "found",
          title: `Reconnue (${confidenceLabel(conf)}) · ${result.topScore} pts`,
        });

        if (burstMode && conf === "HIGH") {
          setMode("review");
          setTimeout(() => { void autoAddCard(result); }, 300);
          return;
        }
      } else {
        pushHistory({
          message: result.logs.at(-1)?.detail ?? "Aucune correspondance trouvée.",
          status: "not-found",
          title: "Non reconnue",
        });
      }

      setMode("review");
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setInlineError(msg);
      pushHistory({ message: msg, status: "error", title: "Erreur scan" });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Ajout automatique (mode rafale) ──────────────────────────────────────
  const autoAddCard = async (res: ScanResolution) => {
    if (!res.bestCardId) return;
    try {
      const collectionId = await ensureCollection();
      const item = await collectionService.addCardToCollection(collectionId, res.bestCardId);
      const qty = Number(item.quantity ?? 1);
      const msg = qty > 1
        ? `${res.bestCardName} déjà présente (×${qty}).`
        : `${res.bestCardName} ajoutée à ${selectedCollection?.name ?? "la collection"}.`;
      toast.showSuccess(msg);
      pushHistory({ message: msg, status: "added", title: "Ajout auto" });
      resetForNextCapture();
    } catch (e) {
      setInlineError(getApiErrorMessage(e));
    }
  };

  const ensureCollection = async (): Promise<string> => {
    if (selectedCollectionId) return selectedCollectionId;
    if (collections[0]?.id) { setSelectedCollectionId(collections[0].id); return collections[0].id; }
    if (!user?.id) throw new Error("Utilisateur non connecté.");
    const created = await collectionService.createCollection({
      name: "Scans rapides",
      description: "Collection créée automatiquement depuis le scan mobile.",
      isPublic: false,
      userId: user.id,
    });
    setCollections((prev) => [created, ...prev]);
    setSelectedCollectionId(created.id);
    return created.id;
  };

  const addToCollection = async () => {
    const cardId = selectedCard?.cardId ?? selectedManualCard?.id;
    const cardName = selectedCard?.cardName ?? selectedManualCard?.name ?? "Carte";
    if (!cardId || isSaving) { setInlineError("Sélectionne une carte avant l'ajout."); return; }
    setIsSaving(true);
    setInlineError(null);
    try {
      const collectionId = await ensureCollection();
      const item = await collectionService.addCardToCollection(collectionId, cardId);
      const qty = Number(item.quantity ?? 1);
      const msg = qty > 1
        ? `${cardName} déjà présente (×${qty}).`
        : `${cardName} ajoutée à ${selectedCollection?.name ?? "la collection"}.`;
      toast.showSuccess(msg);
      pushHistory({ message: msg, status: "added", title: "Ajout collection" });
      if (burstMode) resetForNextCapture();
    } catch (e) {
      setInlineError(getApiErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const runManualSearch = async () => {
    const q = manualQuery.trim();
    if (!q || isManualSearching) return;
    setIsManualSearching(true);
    setInlineError(null);
    try {
      const cards = await cardService.searchCards(q);
      setManualResults(cards);
      if (cards.length === 0) setInlineError("Aucune carte trouvée.");
    } catch (e) { setInlineError(getApiErrorMessage(e)); }
    finally { setIsManualSearching(false); }
  };

  // ── Permission caméra ─────────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.centeredScreen}><ActivityIndicator color="#15233b" size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionIcon}><Ionicons color="#15233b" name="camera" size={48} /></View>
        <Text style={styles.permissionTitle}>Caméra requise</Text>
        <Text style={styles.permissionText}>Le scan a besoin de la caméra pour capturer ta carte Pokémon.</Text>
        <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.permissionSecondaryButton}>
          <Text style={styles.permissionSecondaryText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  // ── Vue Caméra ────────────────────────────────────────────────────────────
  if (mode === "camera") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView facing="back" ref={cameraRef} style={StyleSheet.absoluteFill} />

        {/* Masque opaque en 4 pièces */}
        <View style={[styles.mask, { top: 0, left: 0, right: 0, height: frameY }]} />
        <View style={[styles.mask, { top: frameY + frameH, left: 0, right: 0, bottom: 0 }]} />
        <View style={[styles.mask, { top: frameY, left: 0, width: frameX, height: frameH }]} />
        <View style={[styles.mask, { top: frameY, left: frameX + frameW, right: 0, height: frameH }]} />

        {/* Cadre lumineux */}
        <View style={[styles.cardFrame, { top: frameY, left: frameX, width: frameW, height: frameH }]}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {!isProcessing && (
            <Animated.View
              style={[styles.scanLine, {
                transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [4, frameH - 4] }) }],
              }]}
            />
          )}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.processingText}>Analyse en cours…</Text>
            </View>
          )}
        </View>

        {/* Barre HAUTE */}
        <View style={[styles.cameraTopBar, { paddingTop: insets.top + 8, height: topBarH }]}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons color="#fff" name="arrow-back" size={22} />
          </Pressable>
          <Text style={styles.cameraTitle}>Scanner une carte</Text>
          <View style={styles.burstBadge}>
            <Text style={styles.burstText}>Rafale</Text>
            <Switch onValueChange={setBurstMode} trackColor={{ false: "#555", true: "#7c3aed" }} thumbColor={burstMode ? "#fff" : "#ccc"} value={burstMode} />
          </View>
        </View>

        {/* Label */}
        <View style={[styles.frameLabelRow, { top: frameY + frameH + 10 }]}>
          <Text style={styles.frameLabel}>Place la carte Pokémon dans le cadre</Text>
        </View>

        {/* Barre BASSE */}
        <View style={[styles.cameraBottomBar, { paddingBottom: insets.bottom + 16, height: bottomBarH }]}>
          {inlineError ? (
            <View style={styles.cameraErrorBadge}>
              <Ionicons color="#fff" name="warning" size={13} />
              <Text style={styles.cameraErrorText} numberOfLines={2}>{inlineError}</Text>
            </View>
          ) : history.length > 0 ? (
            <View style={styles.cameraHistoryBadge}>
              {history.slice(0, 1).map((entry) => (
                <View key={entry.id} style={styles.cameraHistoryRow}>
                  <View style={[styles.historyDot, { backgroundColor: historyColor(entry.status) }]} />
                  <Text numberOfLines={1} style={styles.cameraHistoryText}>{entry.message}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            disabled={isProcessing}
            onPress={() => void captureCard()}
            style={({ pressed }) => [styles.captureButton, (pressed || isProcessing) && styles.captureButtonPressed]}
          >
            {isProcessing
              ? <ActivityIndicator color="#f7f1e8" size="large" />
              : <View style={styles.captureButtonInner} />
            }
          </Pressable>

          {burstMode && (
            <View style={styles.burstActiveBadge}>
              <Ionicons color="#7c3aed" name="flash" size={13} />
              <Text style={styles.burstActiveText}>Rafale · ajout auto si confiance élevée</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Vue Review ────────────────────────────────────────────────────────────
  const activeCardId = selectedCard?.cardId ?? selectedManualCard?.id ?? null;
  const activeCardName = selectedCard?.cardName ?? selectedManualCard?.name ?? null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.reviewScreen}>
      {/* Header */}
      <View style={[styles.reviewTopBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={resetForNextCapture} style={styles.reviewBackButton}>
          <Ionicons color="#fff" name="camera-reverse" size={20} />
          <Text style={styles.reviewBackText}>Rescanner</Text>
        </Pressable>
        <Text style={styles.reviewTitle}>Résultat</Text>
        <View style={styles.burstBadgeSmall}>
          <Text style={styles.burstTextSmall}>Rafale</Text>
          <Switch onValueChange={setBurstMode} trackColor={{ false: "#667086", true: "#7c3aed" }} thumbColor={burstMode ? "#fff" : "#ccc"} value={burstMode} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.reviewContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carte trouvée ── */}
        {resolution?.bestCardId ? (
          <View style={styles.foundCardBlock}>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor(confidence) }]}>
              <Ionicons
                color="#fff"
                name={confidence === "HIGH" ? "checkmark-circle" : confidence === "MEDIUM" ? "help-circle" : "alert-circle"}
                size={14}
              />
              <Text style={styles.confidenceLabel}>
                {confidenceLabel(confidence)} · {resolution.topScore} pts
              </Text>
            </View>

            <View style={styles.cardCompareRow}>
              <View style={styles.foundCardImageWrapper}>
                {resolution.bestCardImage ? (
                  <Image source={{ uri: resolution.bestCardImage }} style={styles.foundCardImage} resizeMode="contain" />
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Ionicons color="#7c6a58" name="image-outline" size={36} />
                    <Text style={styles.noImageText}>Pas d'image</Text>
                  </View>
                )}
              </View>

              <View style={styles.foundCardInfo}>
                <Text style={styles.foundCardName} numberOfLines={2}>
                  {resolution.bestCardName ?? "Carte sans nom"}
                </Text>
                {resolution.bestLocalId && (
                  <View style={styles.infoRow}>
                    <Ionicons color="#7c6a58" name="pricetag" size={13} />
                    <Text style={styles.infoText}>#{resolution.bestLocalId}</Text>
                  </View>
                )}
                {resolution.bestSetName && (
                  <View style={styles.infoRow}>
                    <Ionicons color="#7c6a58" name="albums" size={13} />
                    <Text style={styles.infoText}>{resolution.bestSetName}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Miniature scan + debug OCR */}
            {capturedUri && (
              <View style={styles.scanThumbnailRow}>
                <Text style={styles.scanThumbnailLabel}>Scan</Text>
                <Image source={{ uri: capturedUri }} style={styles.scanThumbnail} resizeMode="cover" />
                <Text style={styles.ocrMetaText} numberOfLines={3}>
                  OCR : {resolution.signal.ocrName ?? "?"}{" "}
                  {resolution.signal.ocrLocalId ? `· #${resolution.signal.ocrLocalId}` : ""}
                  {resolution.signal.ocrSetTotal ? `/${resolution.signal.ocrSetTotal}` : ""}
                  {"\n"}Langue : {resolution.signal.ocrLanguage}
                </Text>
              </View>
            )}

            {/* Collection + ajout */}
            <View style={styles.collectionSection}>
              <Text style={styles.collectionSectionTitle}>Ajouter à la collection</Text>
              {isLoadingCollections ? (
                <ActivityIndicator color="#15233b" style={{ marginVertical: 8 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {collections.map((col) => (
                    <Pressable
                      key={col.id}
                      onPress={() => setSelectedCollectionId(col.id)}
                      style={({ pressed }) => [
                        styles.collectionChip,
                        selectedCollectionId === col.id && styles.collectionChipActive,
                        pressed && styles.collectionChipPressed,
                      ]}
                    >
                      <Text style={[styles.collectionChipText, selectedCollectionId === col.id && styles.collectionChipTextActive]}>
                        {col.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <Pressable
                disabled={isSaving}
                onPress={() => void addToCollection()}
                style={({ pressed }) => [styles.addButton, (pressed || isSaving) && styles.addButtonPressed]}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons color="#fff" name="add-circle" size={20} />
                    <Text style={styles.addButtonText}>Ajouter à ma collection</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── Non trouvée ── */
          <View style={styles.notFoundBlock}>
            <Ionicons color="#d97706" name="search-circle" size={52} />
            <Text style={styles.notFoundTitle}>Carte non identifiée</Text>
            <Text style={styles.notFoundSub}>Lance une recherche manuelle ci-dessous.</Text>

            {/* Debug OCR — affiché quand rien n'est trouvé */}
            {resolution && (
              <View style={styles.debugBlock}>
                <Text style={styles.debugTitle}>DÉTECTÉ PAR L'OCR</Text>
                <Text style={styles.debugText}>
                  Nom : "{resolution.signal.ocrName ?? "?"}"
                  {"\n"}Numéro : "{resolution.signal.ocrLocalId ?? "?"}"
                  {resolution.signal.ocrSetTotal ? `/${resolution.signal.ocrSetTotal}` : ""}
                  {"\n"}Langue : {resolution.signal.ocrLanguage}
                </Text>
              </View>
            )}

            {capturedUri && (
              <Image source={{ uri: capturedUri }} style={styles.scanPreviewLarge} resizeMode="contain" />
            )}
          </View>
        )}

        {/* ── Candidats alternatifs ── */}
        {(resolution?.rankedCandidates?.length ?? 0) > 1 && (
          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>
              Autres résultats ({(resolution?.rankedCandidates?.length ?? 1) - 1})
            </Text>
            {resolution!.rankedCandidates.slice(1, 6).map((c) => (
              <Pressable
                key={c.cardId}
                onPress={() => { setSelectedCard(c); setSelectedManualCard(null); setInlineError(null); }}
                style={({ pressed }) => [
                  styles.candidateRow,
                  selectedCard?.cardId === c.cardId && styles.candidateRowSelected,
                  pressed && styles.candidateRowPressed,
                ]}
              >
                {c.image ? (
                  <Image source={{ uri: c.image }} style={styles.candidateThumb} resizeMode="contain" />
                ) : (
                  <View style={styles.candidateThumbPlaceholder}>
                    <Ionicons color="#9ca3af" name="image" size={18} />
                  </View>
                )}
                <View style={styles.candidateInfo}>
                  <Text numberOfLines={1} style={styles.candidateName}>{c.cardName || "Carte sans nom"}</Text>
                  <Text style={styles.candidateMeta}>
                    {c.localId ? `#${c.localId}` : "–"}{c.setName ? ` · ${c.setName}` : ""}
                    {" · "}{c.score} pts
                  </Text>
                </View>
                <View style={[styles.miniConfidenceDot, { backgroundColor: confidenceColor(c.confidence as ScanConfidence) }]} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Logs de pipeline (debug) ── */}
        {resolution && resolution.logs.length > 0 && (
          <View style={styles.debugBlock}>
            <Text style={styles.debugTitle}>PIPELINE — {resolution.logs.reduce((s, l) => s + l.durationMs, 0)}ms total</Text>
            {resolution.logs.map((log, i) => (
              <Text key={i} style={[styles.debugText, !log.success && { color: "#ef4444" }]}>
                {log.success ? "✓" : "✗"} [{log.step}] {log.detail} ({log.durationMs}ms)
              </Text>
            ))}
          </View>
        )}

        {/* ── Recherche manuelle ── */}
        <View style={styles.blockCard}>
          <Text style={styles.sectionTitle}>Recherche manuelle</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Nom de la carte…"
              placeholderTextColor="#9ca3af"
              value={manualQuery}
              onChangeText={setManualQuery}
              onSubmitEditing={() => void runManualSearch()}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => void runManualSearch()}
              style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
            >
              {isManualSearching
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons color="#fff" name="search" size={18} />
              }
            </Pressable>
          </View>

          {manualResults.length > 0 && (
            <View style={styles.resultList}>
              {manualResults.slice(0, 8).map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => { setSelectedManualCard(card); setSelectedCard(null); setInlineError(null); }}
                  style={({ pressed }) => [
                    styles.resultRow,
                    selectedManualCard?.id === card.id && styles.resultRowSelected,
                    pressed && styles.resultRowPressed,
                  ]}
                >
                  {card.image ? (
                    <Image source={{ uri: card.image }} style={styles.resultThumb} resizeMode="contain" />
                  ) : (
                    <View style={styles.resultThumbPlaceholder}>
                      <Ionicons color="#9ca3af" name="image" size={14} />
                    </View>
                  )}
                  <View style={styles.resultInfo}>
                    <Text numberOfLines={1} style={styles.resultTitle}>{card.name ?? "?"}</Text>
                    <Text style={styles.resultMeta}>
                      {card.localId ? `#${card.localId}` : "–"}{card.set?.name ? ` · ${card.set.name}` : ""}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {/* Bouton ajout depuis la recherche manuelle */}
              {selectedManualCard && (
                <Pressable
                  disabled={isSaving}
                  onPress={() => void addToCollection()}
                  style={({ pressed }) => [styles.addButton, { marginTop: 8 }, (pressed || isSaving) && styles.addButtonPressed]}
                >
                  {isSaving ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons color="#fff" name="add-circle" size={20} />
                      <Text style={styles.addButtonText}>Ajouter à ma collection</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Erreur inline */}
        {inlineError && (
          <View style={styles.errorPanel}>
            <Ionicons color="#dc2626" name="alert-circle" size={18} />
            <Text style={styles.errorPanelText}>{inlineError}</Text>
          </View>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>Historique</Text>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyListRow}>
                <View style={[styles.historyDot, { backgroundColor: historyColor(entry.status) }]} />
                <View style={styles.historyListContent}>
                  <Text style={styles.historyListTitle}>{entry.title}</Text>
                  <Text style={styles.historyListText} numberOfLines={2}>{entry.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centeredScreen: { alignItems: "center", backgroundColor: "#f2ede6", flex: 1, justifyContent: "center" },

  // Caméra
  cameraContainer: { backgroundColor: "#000", flex: 1 },
  mask: { backgroundColor: "rgba(0,0,0,0.6)", position: "absolute" },
  cardFrame: { borderColor: "transparent", borderWidth: 0, position: "absolute" },
  corner: { borderColor: "#fff", height: 28, position: "absolute", width: 28 },
  cornerTL: { borderLeftWidth: 3, borderTopWidth: 3, left: 0, top: 0 },
  cornerTR: { borderRightWidth: 3, borderTopWidth: 3, right: 0, top: 0 },
  cornerBL: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 0, left: 0 },
  cornerBR: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
  scanLine: {
    backgroundColor: "rgba(99,179,237,0.7)",
    height: 2,
    left: 12,
    position: "absolute",
    right: 12,
    shadowColor: "#63b3ed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  processingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    bottom: 0, gap: 12, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0,
  },
  processingText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  cameraTopBar: {
    alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row",
    justifyContent: "space-between", left: 0, paddingHorizontal: 16, position: "absolute", right: 0, top: 0, zIndex: 10,
  },
  cameraTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  iconButton: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  burstBadge: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 18, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  burstText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  frameLabelRow: { alignItems: "center", left: 0, position: "absolute", right: 0 },
  frameLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500", textAlign: "center" },
  cameraBottomBar: { alignItems: "center", bottom: 0, gap: 10, justifyContent: "flex-end", left: 0, paddingHorizontal: 20, position: "absolute", right: 0, zIndex: 10 },
  cameraErrorBadge: { alignItems: "center", backgroundColor: "rgba(220,38,38,0.85)", borderRadius: 12, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 8, width: "100%" },
  cameraErrorText: { color: "#fff", flex: 1, fontSize: 12 },
  cameraHistoryBadge: { backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, width: "100%" },
  cameraHistoryRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  cameraHistoryText: { color: "rgba(255,255,255,0.85)", flex: 1, fontSize: 12 },
  captureButton: { alignItems: "center", backgroundColor: "#fff", borderColor: "rgba(255,255,255,0.3)", borderRadius: 44, borderWidth: 5, height: 74, justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, width: 74 },
  captureButtonPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  captureButtonInner: { backgroundColor: "#15233b", borderRadius: 30, height: 56, width: 56 },
  burstActiveBadge: { alignItems: "center", backgroundColor: "rgba(124,58,237,0.15)", borderColor: "rgba(124,58,237,0.5)", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  burstActiveText: { color: "#7c3aed", fontSize: 12, fontWeight: "600" },

  // Review
  reviewScreen: { backgroundColor: "#f2ede6", flex: 1 },
  reviewTopBar: { alignItems: "center", backgroundColor: "#15233b", flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, paddingHorizontal: 16 },
  reviewBackButton: { alignItems: "center", flexDirection: "row", gap: 6 },
  reviewBackText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  reviewTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  burstBadgeSmall: { alignItems: "center", flexDirection: "row", gap: 4 },
  burstTextSmall: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600" },
  reviewContent: { gap: 12, padding: 16 },

  // Carte trouvée
  foundCardBlock: { backgroundColor: "#fff", borderColor: "#e5e0d8", borderRadius: 20, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  confidenceBadge: { alignItems: "center", flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  confidenceLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cardCompareRow: { flexDirection: "row", gap: 16, padding: 16, paddingTop: 8 },
  foundCardImageWrapper: { alignItems: "center", borderRadius: 12, overflow: "hidden", width: 120 },
  foundCardImage: { borderRadius: 10, height: 170, width: 120 },
  noImagePlaceholder: { alignItems: "center", backgroundColor: "#f3f1ed", borderRadius: 10, gap: 8, height: 170, justifyContent: "center", width: 120 },
  noImageText: { color: "#7c6a58", fontSize: 12 },
  foundCardInfo: { flex: 1, gap: 8, justifyContent: "center" },
  foundCardName: { color: "#15233b", fontSize: 20, fontWeight: "800", lineHeight: 24 },
  infoRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  infoText: { color: "#5d6776", fontSize: 13, fontWeight: "500" },
  scanThumbnailRow: { alignItems: "center", backgroundColor: "#f8f6f2", borderTopColor: "#e5e0d8", borderTopWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  scanThumbnailLabel: { color: "#7c6a58", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  scanThumbnail: { borderRadius: 6, height: 50, width: 36 },
  ocrMetaText: { color: "#8b92a1", flex: 1, fontSize: 11 },
  collectionSection: { borderTopColor: "#e5e0d8", borderTopWidth: 1, gap: 10, padding: 16 },
  collectionSectionTitle: { color: "#15233b", fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  collectionChip: { backgroundColor: "#f3f1ed", borderColor: "#ded8d0", borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  collectionChipActive: { backgroundColor: "#15233b", borderColor: "#15233b" },
  collectionChipPressed: { opacity: 0.8 },
  collectionChipText: { color: "#2b3340", fontSize: 13, fontWeight: "700" },
  collectionChipTextActive: { color: "#fff" },
  addButton: { alignItems: "center", backgroundColor: "#15233b", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54, paddingHorizontal: 16, shadowColor: "#15233b", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addButtonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Non trouvée
  notFoundBlock: { alignItems: "center", backgroundColor: "#fff", borderColor: "#fde68a", borderRadius: 20, borderWidth: 1, gap: 8, padding: 24 },
  notFoundTitle: { color: "#92400e", fontSize: 18, fontWeight: "800" },
  notFoundSub: { color: "#6b7280", fontSize: 14, textAlign: "center" },
  scanPreviewLarge: { borderRadius: 10, height: 160, marginTop: 8, width: 120 },

  // Candidats
  blockCard: { backgroundColor: "#fff", borderColor: "#e5e0d8", borderRadius: 20, borderWidth: 1, gap: 8, padding: 16 },
  sectionTitle: { color: "#15233b", fontSize: 14, fontWeight: "800", letterSpacing: 0.2, marginBottom: 4 },
  candidateRow: { alignItems: "center", backgroundColor: "#f8f6f2", borderRadius: 12, flexDirection: "row", gap: 12, padding: 10 },
  candidateRowSelected: { backgroundColor: "#e8f0fe", borderColor: "#15233b", borderWidth: 1.5 },
  candidateRowPressed: { opacity: 0.8 },
  candidateThumb: { borderRadius: 6, height: 48, width: 34 },
  candidateThumbPlaceholder: { alignItems: "center", backgroundColor: "#e5e0d8", borderRadius: 6, height: 48, justifyContent: "center", width: 34 },
  candidateInfo: { flex: 1 },
  candidateName: { color: "#15233b", fontSize: 14, fontWeight: "700" },
  candidateMeta: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  miniConfidenceDot: { borderRadius: 5, height: 10, width: 10 },

  // Debug
  debugBlock: { backgroundColor: "#f8f6f2", borderRadius: 12, padding: 12 },
  debugTitle: { color: "#7c6a58", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  debugText: { color: "#8b92a1", fontSize: 12, lineHeight: 18 },

  // Recherche manuelle
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: { backgroundColor: "#f3f1ed", borderColor: "#ded8d0", borderRadius: 12, borderWidth: 1, color: "#15233b", flex: 1, fontSize: 14, height: 44, paddingHorizontal: 14 },
  searchButton: { alignItems: "center", backgroundColor: "#15233b", borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  searchButtonPressed: { opacity: 0.75 },
  resultList: { gap: 6, marginTop: 4 },
  resultRow: { alignItems: "center", backgroundColor: "#f8f6f2", borderRadius: 12, flexDirection: "row", gap: 10, padding: 10 },
  resultRowSelected: { backgroundColor: "#e8f0fe", borderColor: "#15233b", borderWidth: 1.5 },
  resultRowPressed: { opacity: 0.8 },
  resultThumb: { borderRadius: 5, height: 42, width: 30 },
  resultThumbPlaceholder: { alignItems: "center", backgroundColor: "#e5e0d8", borderRadius: 5, height: 42, justifyContent: "center", width: 30 },
  resultInfo: { flex: 1 },
  resultTitle: { color: "#15233b", fontSize: 14, fontWeight: "700" },
  resultMeta: { color: "#6b7280", fontSize: 12, marginTop: 2 },

  // Erreur & historique
  errorPanel: { alignItems: "center", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, padding: 14 },
  errorPanelText: { color: "#dc2626", flex: 1, fontSize: 13 },
  historyListRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  historyDot: { borderRadius: 4, height: 8, marginTop: 5, width: 8 },
  historyListContent: { flex: 1, gap: 2 },
  historyListTitle: { color: "#15233b", fontSize: 14, fontWeight: "700" },
  historyListText: { color: "#5d6776", fontSize: 13 },

  // Permission
  permissionScreen: { alignItems: "center", backgroundColor: "#f2ede6", flex: 1, gap: 16, justifyContent: "center", padding: 32 },
  permissionIcon: { alignItems: "center", backgroundColor: "#e8f0fe", borderRadius: 40, height: 80, justifyContent: "center", marginBottom: 8, width: 80 },
  permissionTitle: { color: "#15233b", fontSize: 22, fontWeight: "800", textAlign: "center" },
  permissionText: { color: "#5d6776", fontSize: 15, lineHeight: 22, textAlign: "center" },
  permissionButton: { alignItems: "center", backgroundColor: "#15233b", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, width: "100%" },
  permissionButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  permissionSecondaryButton: { alignItems: "center", paddingVertical: 8 },
  permissionSecondaryText: { color: "#5d6776", fontSize: 15 },
});
