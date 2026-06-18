import { CameraView } from "expo-camera";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BURST_FRAMES,
  buildHistoryId,
  candidateToCard,
  HISTORY_LIMIT,
  type ScanMode,
} from "@/constants/scan";
import { useAuth } from "@/contexts/AuthProvider";
import { cardService } from "@/services/card.service";
import { collectionService } from "@/services/collection.service";
import { ocrService } from "@/services/ocr.service";
import { scanService } from "@/services/scan.service";
import { toast } from "@/store/useToastStore";
import type {
  CardSearchResult,
  ScanConfidenceLevel,
  ScanHistoryItem,
  ScanParsedFields,
  UserCollection,
} from "@/types";
import { getApiErrorMessage } from "@/utils/apiError";

export function useScanFlow() {
  const cameraRef = useRef<CameraView>(null);
  const { user } = useAuth();

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

  const selectCard = (card: CardSearchResult) => {
    setSelectedCard(card);
    setInlineError(null);
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

      resetForNextCapture();
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

  const captureCard = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    setInlineError(null);
    setManualResults([]);
    setManualQuery("");

    // une rafale de frames : le cadrage varie d'une prise à l'autre, le backend
    // garde la meilleure
    const frames: string[] = [];
    try {
      // on affiche la 1re frame et on lève l'overlay tout de suite, ce qui masque
      // les micro-gels du preview pendant les captures suivantes
      const first = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (!first?.uri) {
        throw new Error("Capture impossible.");
      }
      frames.push(first.uri);
      setCapturedUri(first.uri);
      setIsProcessing(true);

      // frames restantes capturées derrière l'overlay
      for (let i = 1; i < BURST_FRAMES; i++) {
        const picture = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
        });
        if (picture?.uri) {
          frames.push(picture.uri);
        }
      }
    } catch {
      setInlineError(
        "Capture impossible. Reessaie dans une zone bien eclairee.",
      );
      setIsProcessing(false);
      return;
    }

    try {
      // séquentiel et non parallèle : chaque frame est décodée en bitmap plein
      // format (~48 Mo), tout faire d'un coup dépasse le pool mémoire natif Android
      const optimizedUris: string[] = [];
      for (const uri of frames) {
        optimizedUris.push(await ocrService.optimizeImage(uri));
      }
      setOptimizedUri(optimizedUris[0] ?? null);

      const result = await scanService.recognize(optimizedUris);
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

  return {
    cameraRef,
    mode,
    isProcessing,
    isSaving,
    isManualSearching,
    burstMode,
    setBurstMode,
    capturedUri,
    optimizedUri,
    parsed,
    confidence,
    confidenceLevel,
    selectedCard,
    candidateCards,
    showOtherMatches,
    setShowOtherMatches,
    manualQuery,
    setManualQuery,
    manualResults,
    collections,
    selectedCollectionId,
    setSelectedCollectionId,
    isLoadingCollections,
    history,
    inlineError,
    selectedCollection,
    selectCard,
    captureCard,
    runManualSearch,
    addCardToCollection,
    resetForNextCapture,
  };
}

export type ScanFlow = ReturnType<typeof useScanFlow>;
