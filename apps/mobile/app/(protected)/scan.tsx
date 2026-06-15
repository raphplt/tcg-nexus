import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../services/api";
import { performOcr } from "../../services/ocr.service";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Viewfinder dimensions (matches Pokémon card aspect ratio ~2.5x3.5)
const VIEWFINDER_WIDTH = SCREEN_WIDTH * 0.75;
const VIEWFINDER_HEIGHT = VIEWFINDER_WIDTH * 1.4;

interface ScannedHistoryItem {
  id: string;
  name: string;
  localId?: string;
  image?: string;
  setName?: string;
  status: "pending" | "success" | "failed" | "not_found";
  timestamp: Date;
}

interface Collection {
  id: string | number;
  name: string;
  description?: string;
}

interface Card {
  id: string;
  name: string;
  image?: string;
  localId?: string;
  rarity?: string;
  set?: {
    id: string;
    name: string;
    logo?: string;
    cardCount?: {
      official: number;
      total: number;
    };
  };
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  const [cameraLayout, setCameraLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [history, setHistory] = useState<ScannedHistoryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | number
  >("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [croppedImageUri, setCroppedImageUri] = useState<string | null>(null);
  const [foundCard, setFoundCard] = useState<Card | null>(null);
  const [scannedTextDetails, setScannedTextDetails] = useState<{
    name?: string;
    localId?: string;
  } | null>(null);
  const [manualQuery, setManualQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [isSearchingManual, setIsSearchingManual] = useState<boolean>(false);
  const [bulkToast, setBulkToast] = useState<{
    visible: boolean;
    message: string;
    success: boolean;
  }>({
    visible: false,
    message: "",
    success: true,
  });

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    fetchUserCollections();
  }, []);

  const fetchUserCollections = async () => {
    try {
      const response = await api.get<Collection[]>("/collection/user/1");
      setCollections(response.data);
      const firstCol = response.data[0];
      if (firstCol) {
        setSelectedCollectionId(firstCol.id);
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="camera-outline"
          size={64}
          color="#6366f1"
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.permissionText}>
          TCG Nexus a besoin d'accéder à votre caméra pour pouvoir scanner vos
          cartes Pokémon.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelLinkText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Afficher un toast en mode rafale
  const triggerBulkToast = (message: string, success: boolean) => {
    setBulkToast({ visible: true, message, success });
    setTimeout(() => {
      setBulkToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  };

  const matchCardFromOcr = async (
    ocrName?: string,
    ocrLocalId?: string,
    denominator?: string,
  ): Promise<Card | null> => {
    if (!ocrName && !ocrLocalId) return null;

    try {
      let cardsFound: Card[] = [];
      if (ocrLocalId) {
        const res = await api.get<Card[]>(`/cards/search/${ocrLocalId}`);
        cardsFound = res.data;
      }

      if (cardsFound.length === 0 && ocrName) {
        const res = await api.get<Card[]>(`/cards/search/${ocrName}`);
        cardsFound = res.data;
      }

      if (cardsFound.length === 0) return null;

      let bestMatch: Card | null = null;
      let highestScore = -1;

      for (const card of cardsFound) {
        let score = 0;

        if (ocrLocalId && card.localId === ocrLocalId) {
          score += 10;
        } else if (ocrLocalId && card.localId?.includes(ocrLocalId)) {
          score += 5;
        }

        if (ocrName && card.name) {
          const cName = card.name.toLowerCase();
          const oName = ocrName.toLowerCase();
          if (cName === oName) {
            score += 15;
          } else if (cName.includes(oName) || oName.includes(cName)) {
            score += 8;
          }
        }

        if (
          denominator &&
          card.set?.cardCount?.official === parseInt(denominator, 10)
        ) {
          score += 10;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = card;
        }
      }

      return bestMatch;
    } catch (err) {
      console.error("Error matching card:", err);
      return null;
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingStatus("Capture de l'image...");

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo) throw new Error("Échec de la capture photo");
      if (!cameraLayout)
        throw new Error("Dimensions de la caméra non définies");

      setProcessingStatus("Optimisation de l'image...");

      // Map viewfinder bounds to raw photo coordinates
      const scaleX = photo.width / cameraLayout.width;
      const scaleY = photo.height / cameraLayout.height;

      const viewfinderX = (cameraLayout.width - VIEWFINDER_WIDTH) / 2;
      const viewfinderY = (cameraLayout.height - VIEWFINDER_HEIGHT) / 2;

      const originX = Math.round(viewfinderX * scaleX);
      const originY = Math.round(viewfinderY * scaleY);
      const width = Math.round(VIEWFINDER_WIDTH * scaleX);
      const height = Math.round(VIEWFINDER_HEIGHT * scaleY);

      // Crop, resize and compress image
      const cropResult = await manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: Math.max(0, originX),
              originY: Math.max(0, originY),
              width: Math.min(photo.width - originX, width),
              height: Math.min(photo.height - originY, height),
            },
          },
          {
            resize: {
              width: 500,
            },
          },
        ],
        { compress: 0.75, format: SaveFormat.JPEG, base64: true },
      );

      setCroppedImageUri(cropResult.uri);
      setProcessingStatus("Reconnaissance OCR en cours...");

      const ocrResult = await performOcr(cropResult.base64 || "");

      setScannedTextDetails({
        name: ocrResult.name,
        localId: ocrResult.localId,
      });
      setProcessingStatus("Recherche dans la base de données...");

      const matched = await matchCardFromOcr(
        ocrResult.name,
        ocrResult.localId,
        ocrResult.denominator,
      );

      if (isBulkMode) {
        if (matched) {
          try {
            await api.post(
              `/collection-item/collection/${selectedCollectionId}`,
              {
                pokemonCardId: matched.id,
              },
            );

            setHistory((prev) => [
              {
                id: Math.random().toString(),
                name: matched.name,
                localId: matched.localId,
                image: matched.image,
                setName: matched.set?.name,
                status: "success",
                timestamp: new Date(),
              },
              ...prev,
            ]);

            triggerBulkToast(
              `${matched.name} (${matched.localId}) ajouté !`,
              true,
            );
          } catch (addErr) {
            triggerBulkToast("Erreur d'ajout automatique", false);
            setHistory((prev) => [
              {
                id: Math.random().toString(),
                name: matched.name,
                localId: matched.localId,
                image: matched.image,
                setName: matched.set?.name,
                status: "failed",
                timestamp: new Date(),
              },
              ...prev,
            ]);
          }
        } else {
          triggerBulkToast("Carte non identifiée", false);
          setHistory((prev) => [
            {
              id: Math.random().toString(),
              name: ocrResult.name || "Carte inconnue",
              localId: ocrResult.localId,
              status: "not_found",
              timestamp: new Date(),
            },
            ...prev,
          ]);
        }
        setIsProcessing(false);
      } else {
        setFoundCard(matched);
        setManualQuery(ocrResult.name || ocrResult.localId || "");
        setIsProcessing(false);
        setShowConfirmModal(true);
      }
    } catch (error: any) {
      console.error("Erreur lors du scan :", error);
      Alert.alert(
        "Erreur",
        error.message || "Une erreur est survenue lors du scan de la carte.",
      );
      setIsProcessing(false);
    }
  };

  const handleManualSearch = async (text: string) => {
    setManualQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingManual(true);
      const response = await api.get<Card[]>(`/cards/search/${text}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error("Error during manual search:", err);
    } finally {
      setIsSearchingManual(false);
    }
  };

  const confirmAddToCollection = async () => {
    if (!foundCard || !selectedCollectionId) return;

    try {
      setIsProcessing(true);
      await api.post(`/collection-item/collection/${selectedCollectionId}`, {
        pokemonCardId: foundCard.id,
      });

      setHistory((prev) => [
        {
          id: Math.random().toString(),
          name: foundCard.name,
          localId: foundCard.localId,
          image: foundCard.image,
          setName: foundCard.set?.name,
          status: "success",
          timestamp: new Date(),
        },
        ...prev,
      ]);

      setShowConfirmModal(false);
      setFoundCard(null);
      setCroppedImageUri(null);
      setSearchResults([]);
      setManualQuery("");
      Alert.alert(
        "Succès",
        `La carte ${foundCard.name} a été ajoutée à votre collection.`,
      );
    } catch (error) {
      console.error("Erreur lors de l'ajout à la collection :", error);
      Alert.alert("Erreur", "Impossible d'ajouter la carte à la collection.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        flash={flash}
        onLayout={(e) => setCameraLayout(e.nativeEvent.layout)}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {isProcessing && <View style={styles.scanningLine} />}
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.circularButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                !isBulkMode && styles.activeModeButton,
              ]}
              onPress={() => setIsBulkMode(false)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  !isBulkMode && styles.activeModeButtonText,
                ]}
              >
                Unique
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, isBulkMode && styles.activeModeButton]}
              onPress={() => setIsBulkMode(true)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  isBulkMode && styles.activeModeButtonText,
                ]}
              >
                Rafale
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.circularButton}
            onPress={() => setFlash((prev) => (prev === "on" ? "off" : "on"))}
          >
            <Ionicons
              name={flash === "on" ? "flash" : "flash-off"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {bulkToast.visible && (
          <View
            style={[
              styles.toast,
              bulkToast.success ? styles.toastSuccess : styles.toastError,
            ]}
          >
            <Ionicons
              name={bulkToast.success ? "checkmark-circle" : "alert-circle"}
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.toastText}>{bulkToast.message}</Text>
          </View>
        )}

        <View style={styles.footerContainer}>
          {history.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Derniers scans</Text>
              <FlatList
                horizontal
                data={history}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.historyCard}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.historyCardImage}
                      />
                    ) : (
                      <View style={styles.historyCardPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#aaa" />
                      </View>
                    )}
                    <View style={styles.historyCardOverlay}>
                      <Ionicons
                        name={
                          item.status === "success"
                            ? "checkmark-circle"
                            : item.status === "failed"
                              ? "close-circle"
                              : "help-circle"
                        }
                        size={16}
                        color={
                          item.status === "success"
                            ? "#4ade80"
                            : item.status === "failed"
                              ? "#f87171"
                              : "#fbbf24"
                        }
                      />
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          <View style={styles.captureRow}>
            {isProcessing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>{processingStatus}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.captureOuterButton}
                onPress={handleCapture}
              >
                <View style={styles.captureInnerButton} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>

      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragBar} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmer le Scan</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View>
                  <View style={styles.visualComparison}>
                    <View style={styles.imageColumn}>
                      <Text style={styles.imageLabel}>Image Scannée</Text>
                      {croppedImageUri ? (
                        <Image
                          source={{ uri: croppedImageUri }}
                          style={styles.scanPreviewImage}
                        />
                      ) : (
                        <View
                          style={[
                            styles.scanPreviewImage,
                            styles.centerContainer,
                          ]}
                        >
                          <Ionicons
                            name="image-outline"
                            size={32}
                            color="#aaa"
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.imageColumn}>
                      <Text style={styles.imageLabel}>Résultat BDD</Text>
                      {foundCard?.image ? (
                        <Image
                          source={{ uri: foundCard.image }}
                          style={styles.dbPreviewImage}
                        />
                      ) : (
                        <View
                          style={[
                            styles.dbPreviewImage,
                            styles.centerContainer,
                            { backgroundColor: "#f3f4f6" },
                          ]}
                        >
                          <Ionicons
                            name="help-circle-outline"
                            size={48}
                            color="#9ca3af"
                          />
                          <Text style={styles.noCardText}>
                            Aucun match automatique
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {foundCard && (
                    <View style={styles.foundCardDetails}>
                      <Text style={styles.foundCardName}>{foundCard.name}</Text>
                      <Text style={styles.foundCardSet}>
                        N° {foundCard.localId} — Set:{" "}
                        {foundCard.set?.name || "Inconnu"}
                      </Text>
                      {foundCard.rarity && (
                        <View style={styles.rarityBadge}>
                          <Text style={styles.rarityText}>
                            {foundCard.rarity}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionLabel}>Collection cible</Text>
                    {collections.length > 0 ? (
                      <View style={styles.collectionSelector}>
                        {collections.map((col) => (
                          <TouchableOpacity
                            key={col.id}
                            style={[
                              styles.collectionPill,
                              selectedCollectionId === col.id &&
                                styles.activeCollectionPill,
                            ]}
                            onPress={() => setSelectedCollectionId(col.id)}
                          >
                            <Text
                              style={[
                                styles.collectionPillText,
                                selectedCollectionId === col.id &&
                                  styles.activeCollectionPillText,
                              ]}
                            >
                              {col.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noCollectionsText}>
                        Aucune collection disponible
                      </Text>
                    )}
                  </View>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionLabel}>Correction manuelle</Text>
                    <View style={styles.searchBarContainer}>
                      <Ionicons
                        name="search"
                        size={20}
                        color="#9ca3af"
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher par nom ou numéro..."
                        value={manualQuery}
                        onChangeText={handleManualSearch}
                      />
                      {manualQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => handleManualSearch("")}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#9ca3af"
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {isSearchingManual && (
                      <ActivityIndicator
                        size="small"
                        color="#6366f1"
                        style={{ marginTop: 12 }}
                      />
                    )}

                    {searchResults.length > 0 && (
                      <View style={styles.searchResultsContainer}>
                        <Text style={styles.searchResultsTitle}>
                          Résultats de recherche :
                        </Text>
                        {searchResults.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.searchResultItem}
                            onPress={() => {
                              setFoundCard(item);
                              setSearchResults([]);
                            }}
                          >
                            <Image
                              source={{ uri: item.image }}
                              style={styles.searchResultThumbnail}
                              resizeMode="contain"
                            />
                            <View style={styles.searchResultInfo}>
                              <Text style={styles.searchResultName}>
                                {item.name}
                              </Text>
                              <Text style={styles.searchResultSet}>
                                N° {item.localId} — {item.set?.name}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="#9ca3af"
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => setShowConfirmModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.confirmButton,
                        (!foundCard || isProcessing) && styles.disabledButton,
                      ]}
                      onPress={confirmAddToCollection}
                      disabled={!foundCard || isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.confirmButtonText}>Ajouter</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  permissionText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelLink: {
    marginTop: 16,
  },
  cancelLinkText: {
    color: "#6b7280",
    fontSize: 14,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  middleRow: {
    height: VIEWFINDER_HEIGHT,
    flexDirection: "row",
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  viewfinder: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#6366f1",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanningLine: {
    height: 3,
    width: "100%",
    backgroundColor: "#818cf8",
    position: "absolute",
    top: 0,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    opacity: 0.8,
    // Note: React Native pure CSS animation could be simulated, but static bar + pulsing state is cleaner
  },
  bottomOverlay: {
    flex: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  circularButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modeContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  activeModeButton: {
    backgroundColor: "#6366f1",
  },
  modeButtonText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  activeModeButtonText: {
    color: "#fff",
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 110 : 90,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastSuccess: {
    backgroundColor: "#10b981",
  },
  toastError: {
    backgroundColor: "#ef4444",
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    zIndex: 10,
  },
  historyContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  historyCard: {
    width: 50,
    height: 70,
    borderRadius: 4,
    marginRight: 10,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#111",
    overflow: "hidden",
  },
  historyCardImage: {
    width: "100%",
    height: "100%",
  },
  historyCardPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  historyCardOverlay: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
  },
  captureRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  captureInnerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalDragBar: {
    width: 40,
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  visualComparison: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  imageColumn: {
    width: "48%",
    alignItems: "center",
  },
  imageLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  scanPreviewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dbPreviewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  noCardText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  foundCardDetails: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  foundCardName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  foundCardSet: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
  },
  rarityBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 11,
    color: "#4f46e5",
    fontWeight: "bold",
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4b5563",
    marginBottom: 8,
  },
  collectionSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  collectionPill: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  activeCollectionPill: {
    backgroundColor: "#e0e7ff",
    borderColor: "#6366f1",
  },
  collectionPillText: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  activeCollectionPillText: {
    color: "#4f46e5",
  },
  noCollectionsText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#1f2937",
  },
  searchResultsContainer: {
    marginTop: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 8,
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#9ca3af",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  searchResultThumbnail: {
    width: 32,
    height: 44,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  searchResultSet: {
    fontSize: 11,
    color: "#6b7280",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  actionButton: {
    width: "48%",
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#4b5563",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#6366f1",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#a5b4fc",
  },
});
