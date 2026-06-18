import type Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/theme";
import type {
  CardSearchResult,
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanHistoryItem,
} from "@/types";

export type ScanMode = "camera" | "review";

export const CARD_RATIO = 63 / 88; // largeur / hauteur d'une carte Pokémon

// frames capturées par scan, le backend garde la meilleure
export const BURST_FRAMES = 5;

export const HISTORY_LIMIT = 8;

export const candidateToCard = (
  candidate: ScanCardCandidate,
): CardSearchResult => ({
  id: candidate.id,
  name: candidate.name,
  image: candidate.image,
  localId: candidate.localId,
  rarity: candidate.rarity,
  set: candidate.setName ? { name: candidate.setName } : undefined,
});

export const CONFIDENCE_META: Record<
  ScanConfidenceLevel,
  {
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    hint: string;
  }
> = {
  high: {
    color: colors.success,
    icon: "checkmark-circle",
    label: "Confiance élevée",
    hint: "Carte reconnue, prête à être ajoutée.",
  },
  medium: {
    color: colors.warning,
    icon: "help-circle",
    label: "À confirmer",
    hint: "Vérifie la carte parmi les candidats proposés.",
  },
  low: {
    color: colors.destructive,
    icon: "alert-circle",
    label: "Reconnaissance incertaine",
    hint: "Aucune correspondance fiable, fais une recherche manuelle.",
  },
};

export const getHistoryColor = (status: ScanHistoryItem["status"]) => {
  switch (status) {
    case "added":
      return colors.success;
    case "found":
      return colors.secondary;
    case "not-found":
      return colors.warning;
    default:
      return colors.destructive;
  }
};

export const buildHistoryId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
