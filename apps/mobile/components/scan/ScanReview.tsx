import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getHistoryColor } from "@/constants/scan";
import { colors, radius } from "@/constants/theme";
import type { ScanFlow } from "@/hooks/useScanFlow";
import { CardRow } from "./CardRow";
import { CompareSection } from "./CompareSection";
import { ConfidenceBanner } from "./ConfidenceBanner";

export function ScanReview({ scan }: { scan: ScanFlow }) {
  const insets = useSafeAreaInsets();
  const photoUri = scan.optimizedUri || scan.capturedUri || null;

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
            <Pressable
              onPress={scan.resetForNextCapture}
              style={styles.lightButton}
            >
              <Ionicons color={colors.foreground} name="camera-reverse" size={18} />
              <Text style={styles.lightButtonText}>Rescanner</Text>
            </Pressable>

            <View style={styles.burstInlineRow}>
              <Text style={styles.burstInlineText}>Mode rafale</Text>
              <Switch
                onValueChange={scan.setBurstMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                value={scan.burstMode}
              />
            </View>
          </View>

          {scan.confidenceLevel ? (
            <ConfidenceBanner
              confidence={scan.confidence}
              level={scan.confidenceLevel}
            />
          ) : null}

          <CompareSection
            parsed={scan.parsed}
            photoUri={photoUri}
            selectedCard={scan.selectedCard}
          />

          {scan.candidateCards.length > 0 && scan.confidenceLevel === "high" ? (
            // confiance haute : on replie les autres correspondances
            <View style={styles.blockCard}>
              <Pressable
                onPress={() => scan.setShowOtherMatches((v) => !v)}
                style={styles.toggleRow}
              >
                <Text style={styles.toggleText}>
                  Ce n'est pas la bonne carte ?
                </Text>
                <Ionicons
                  color={colors.mutedForeground}
                  name={scan.showOtherMatches ? "chevron-up" : "chevron-down"}
                  size={18}
                />
              </Pressable>
              {scan.showOtherMatches ? (
                <View style={styles.resultList}>
                  {scan.candidateCards.slice(0, 6).map((card) => (
                    <CardRow
                      card={card}
                      key={card.id}
                      onSelect={scan.selectCard}
                      selected={scan.selectedCard?.id === card.id}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {scan.candidateCards.length > 0 && scan.confidenceLevel !== "high" ? (
            // confiance moyenne/basse : comparer et choisir la bonne carte
            <View style={styles.blockCard}>
              <Text style={styles.sectionTitle}>Choisis la bonne carte</Text>
              <View style={styles.resultList}>
                {scan.candidateCards.slice(0, 6).map((card) => (
                  <CardRow
                    card={card}
                    key={card.id}
                    onSelect={scan.selectCard}
                    selected={scan.selectedCard?.id === card.id}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>Rechercher une autre carte</Text>
            <View style={styles.searchRow}>
              <TextInput
                autoCapitalize="none"
                onChangeText={scan.setManualQuery}
                placeholder="Nom de carte, set ou numero"
                placeholderTextColor={colors.mutedForeground}
                style={styles.searchInput}
                value={scan.manualQuery}
              />
              <Pressable
                disabled={scan.isManualSearching}
                onPress={() => {
                  void scan.runManualSearch();
                }}
                style={({ pressed }) => [
                  styles.searchButton,
                  (pressed || scan.isManualSearching) &&
                    styles.searchButtonPressed,
                ]}
              >
                {scan.isManualSearching ? (
                  <ActivityIndicator color={colors.secondaryForeground} size="small" />
                ) : (
                  <Ionicons color={colors.secondaryForeground} name="search" size={16} />
                )}
              </Pressable>
            </View>

            {scan.manualResults.length > 0 ? (
              <View style={styles.resultList}>
                {scan.manualResults.slice(0, 6).map((card) => (
                  <CardRow
                    card={card}
                    key={card.id}
                    onSelect={scan.selectCard}
                    selected={scan.selectedCard?.id === card.id}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>Ajouter à une collection</Text>
            {scan.isLoadingCollections ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <View style={styles.collectionWrap}>
                {scan.collections.map((collection) => (
                  <Pressable
                    key={collection.id}
                    onPress={() => scan.setSelectedCollectionId(collection.id)}
                    style={({ pressed }) => [
                      styles.collectionChip,
                      scan.selectedCollectionId === collection.id &&
                        styles.collectionChipActive,
                      pressed && styles.collectionChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.collectionChipText,
                        scan.selectedCollectionId === collection.id &&
                          styles.collectionChipTextActive,
                      ]}
                    >
                      {collection.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.blockCard}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            {scan.history.length === 0 ? (
              <Text style={styles.emptyText}>Aucun scan pour le moment.</Text>
            ) : (
              scan.history.map((entry) => (
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

          {scan.inlineError ? (
            <Text style={styles.inlineErrorPanel}>{scan.inlineError}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            disabled={scan.isSaving || !scan.selectedCard}
            onPress={() => {
              void scan.addCardToCollection();
            }}
            style={({ pressed }) => [
              styles.addButton,
              (scan.isSaving || !scan.selectedCard) && styles.addButtonDisabled,
              pressed &&
                !scan.isSaving &&
                scan.selectedCard &&
                styles.addButtonPressed,
            ]}
          >
            {scan.isSaving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons
                  color={colors.primaryForeground}
                  name={scan.selectedCard ? "add-circle" : "albums-outline"}
                  size={22}
                />
                <Text style={styles.addButtonText} numberOfLines={1}>
                  {scan.selectedCard
                    ? `Ajouter à ${scan.selectedCollection?.name ?? "la collection"}`
                    : "Sélectionne une carte"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reviewScreen: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  reviewContainer: {
    flex: 1,
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
  lightButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lightButtonText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  burstInlineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  burstInlineText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  blockCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  toggleText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: "600",
  },
  resultList: {
    gap: 8,
    marginTop: 12,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.foreground,
    flex: 1,
    fontSize: 15,
    height: 44,
    paddingHorizontal: 12,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  searchButtonPressed: {
    opacity: 0.75,
  },
  collectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  collectionChip: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectionChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  collectionChipPressed: {
    opacity: 0.8,
  },
  collectionChipText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
  collectionChipTextActive: {
    color: colors.secondaryForeground,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  historyListRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
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
  historyListTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  historyListText: {
    color: colors.mutedForeground,
    fontSize: 13,
  },
  inlineErrorPanel: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    elevation: 6,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  addButtonDisabled: {
    backgroundColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "800",
  },
});
