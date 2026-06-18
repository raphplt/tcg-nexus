import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView } from "expo-camera";
import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CARD_RATIO, getHistoryColor } from "@/constants/scan";
import { colors, radius } from "@/constants/theme";
import type { ScanFlow } from "@/hooks/useScanFlow";
import { ProcessingOverlay } from "./ProcessingOverlay";

export function CameraScanView({ scan }: { scan: ScanFlow }) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  // cadre au ratio d'une carte, centré et un peu remonté (barre du bas)
  const frameW = Math.min(screenW * 0.84, 360);
  const frameH = frameW / CARD_RATIO;
  const frameTop = Math.max(insets.top + 70, (screenH - frameH) / 2 - 40);

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        facing="back"
        ref={scan.cameraRef}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.cameraTopBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons
            color={colors.primaryForeground}
            name="arrow-back"
            size={22}
          />
        </Pressable>

        <View style={styles.burstBadge}>
          <Text style={styles.burstText}>Rafale</Text>
          <Switch
            onValueChange={scan.setBurstMode}
            trackColor={{ false: colors.mutedForeground, true: colors.primary }}
            value={scan.burstMode}
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
        style={[styles.cameraBottomBar, { paddingBottom: insets.bottom + 18 }]}
      >
        <Pressable
          onPress={() => {
            void scan.captureCard();
          }}
          style={({ pressed }) => [
            styles.captureButton,
            pressed && styles.captureButtonPressed,
          ]}
        >
          <Ionicons color={colors.primaryForeground} name="camera" size={28} />
        </Pressable>

        <Text style={styles.captureHint}>
          Remplis bien le cadre puis capture
        </Text>
      </View>

      <View style={[styles.historyOverlay, { bottom: insets.bottom + 120 }]}>
        {scan.inlineError ? (
          <Text style={styles.inlineError}>{scan.inlineError}</Text>
        ) : null}
        {scan.history.slice(0, 3).map((entry) => (
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

      {/* loader superposé : la caméra reste montée -> pas de remount/flash */}
      {scan.isProcessing ? <ProcessingOverlay uri={scan.capturedUri} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(11,11,11,0.65)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
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
  burstText: {
    color: colors.primaryForeground,
    fontSize: 12,
    fontWeight: "700",
  },
  mask: {
    backgroundColor: "rgba(11,11,11,0.62)",
  },
  frameBorder: {
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: radius.xl,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  corner: {
    borderColor: colors.primaryForeground,
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
    color: colors.heroDarkForeground,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
  },
  cameraBottomBar: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  captureButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primaryForeground,
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
    color: colors.primaryForeground,
    fontSize: 13,
    marginTop: 10,
  },
  historyOverlay: {
    backgroundColor: "rgba(11,11,11,0.72)",
    borderRadius: radius.lg,
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
  historyDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  historyText: {
    color: colors.inputBg,
    flex: 1,
    fontSize: 12,
  },
  inlineError: {
    color: "#f4b4b3",
    fontSize: 12,
    marginBottom: 6,
  },
});
