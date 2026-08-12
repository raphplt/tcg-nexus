import { SCANNER_CONFIG } from "./config";
import type { CardSearchResult } from "@/types";
import type {
  RankedCandidate,
  ScanSignal,
  ScoreBreakdown,
} from "@/types/scanner";

const normalize = (s: string | undefined): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const localIdVariants = (id: string | undefined): string[] => {
  if (!id) return [];
  const variants = [id];
  const n = parseInt(id, 10);
  if (!isNaN(n)) {
    const noPad = String(n);
    const pad3 = String(n).padStart(3, "0");
    if (!variants.includes(noPad)) variants.push(noPad);
    if (!variants.includes(pad3)) variants.push(pad3);
  }
  return variants;
};

const scoreBreakdown = (
  card: CardSearchResult,
  signal: ScanSignal,
): ScoreBreakdown => {
  const cardName = normalize(card.name);
  const cardLocalId = normalize(card.localId);
  const cardSetTotal = normalize(card.set?.name); // on n'a pas setTotal directement

  const targetName = normalize(signal.ocrName);
  const targetIdVariants = localIdVariants(signal.ocrLocalId);

  let nameScore = 0;
  if (targetName) {
    if (cardName === targetName) {
      nameScore = SCANNER_CONFIG.SCORE_NAME_EXACT;
    } else if (cardName.includes(targetName) || targetName.includes(cardName)) {
      nameScore = SCANNER_CONFIG.SCORE_NAME_PARTIAL;
    }
  }

  let numberScore = 0;
  if (targetIdVariants.length > 0) {
    const nCardId = normalize(card.localId);
    if (targetIdVariants.some((v) => v === nCardId)) {
      numberScore = SCANNER_CONFIG.SCORE_NUMBER_EXACT;
    } else if (targetIdVariants.some((v) => v && nCardId.includes(v))) {
      numberScore = SCANNER_CONFIG.SCORE_NUMBER_PARTIAL;
    }
  }

  let setCoherenceScore = 0;
  if (signal.ocrSetTotal && signal.ocrLocalId) {
    const cardNum = parseInt(signal.ocrLocalId, 10);
    const total = parseInt(signal.ocrSetTotal, 10);
    if (!isNaN(cardNum) && !isNaN(total) && cardNum <= total && cardNum > 0) {
      setCoherenceScore = SCANNER_CONFIG.SCORE_SET_COHERENT;
    }
  }

  let visualScore = 0;
  if (signal.visualMatches.length > 0) {
    const match = signal.visualMatches.find((m) => m.cardId === card.id);
    if (match) {
      visualScore = Math.round(match.similarity * SCANNER_CONFIG.SCORE_VISUAL);
    }
  }

  const total = nameScore + numberScore + setCoherenceScore + visualScore;

  return { nameScore, numberScore, setCoherenceScore, visualScore, total };
};

const confidenceFromScore = (score: number): "HIGH" | "MEDIUM" | "LOW" => {
  if (score >= SCANNER_CONFIG.CONFIDENCE_HIGH_THRESHOLD) return "HIGH";
  if (score >= SCANNER_CONFIG.CONFIDENCE_MEDIUM_THRESHOLD) return "MEDIUM";
  return "LOW";
};

export const candidateRanker = {
  /**
   * Ranks candidates by descending score and excludes those with no shared signal.
   */
  rank(candidates: CardSearchResult[], signal: ScanSignal): RankedCandidate[] {
    return candidates
      .map((card): RankedCandidate => {
        const breakdown = scoreBreakdown(card, signal);
        return {
          cardId: card.id,
          cardName: card.name ?? "",
          localId: card.localId ?? "",
          setName: card.set?.name ?? "",
          image: card.image,
          score: breakdown.total,
          breakdown,
          confidence: confidenceFromScore(breakdown.total),
        };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);
  },
};
