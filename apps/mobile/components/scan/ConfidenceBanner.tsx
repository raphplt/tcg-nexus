import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { CONFIDENCE_META } from "@/constants/scan";
import { colors, radius } from "@/constants/theme";
import type { ScanConfidenceLevel } from "@/types";

interface ConfidenceBannerProps {
  level: ScanConfidenceLevel;
  confidence: number;
}

export function ConfidenceBanner({ level, confidence }: ConfidenceBannerProps) {
  const meta = CONFIDENCE_META[level];

  return (
    <View style={[styles.confidenceBanner, { borderColor: meta.color }]}>
      <Ionicons color={meta.color} name={meta.icon} size={22} />
      <View style={styles.confidenceTextWrap}>
        <Text style={[styles.confidenceLabel, { color: meta.color }]}>
          {meta.label} · {Math.round(confidence * 100)}%
        </Text>
        <Text style={styles.confidenceHint}>{meta.hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confidenceBanner: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
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
    color: colors.mutedForeground,
    fontSize: 12,
  },
});
