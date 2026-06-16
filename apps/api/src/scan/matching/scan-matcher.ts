import type {
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanParsedFields,
} from "@repo/scan-contract";
import type { Card } from "../../card/entities/card.entity";

const normalize = (value?: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const scoreCard = (card: Card, parsed: ScanParsedFields): number => {
  let score = 0;

  const cardName = normalize(card.name);
  const cardLocalId = normalize(card.localId);
  const cardSetName = normalize(card.set?.name);

  const targetName = normalize(parsed.cardName);
  const targetSetName = normalize(parsed.setName);
  const targetSetNumber = normalize(parsed.setNumber);

  if (targetName && cardName === targetName) {
    score += 70;
  } else if (targetName && cardName.includes(targetName)) {
    score += 45;
  } else if (targetName && targetName.includes(cardName)) {
    score += 35;
  }

  if (targetSetNumber && cardLocalId && cardLocalId === targetSetNumber) {
    score += 45;
  }

  if (targetSetName && cardSetName && cardSetName.includes(targetSetName)) {
    score += 20;
  }

  if (!targetName && cardName) {
    score += 5;
  }

  return score;
};

export const toCandidate = (card: Card, score: number): ScanCardCandidate => ({
  id: card.id,
  name: card.name,
  image: card.image,
  localId: card.localId,
  rarity: card.rarity,
  setName: card.set?.name,
  score,
});

export const STRONG_MATCH_SCORE = 100;

export const computeConfidence = (
  candidates: ScanCardCandidate[],
): { confidence: number; confidenceLevel: ScanConfidenceLevel } => {
  const best = candidates[0]?.score ?? 0;
  const confidence = Math.max(0, Math.min(1, best / 120));

  let confidenceLevel: ScanConfidenceLevel = "low";
  if (best >= STRONG_MATCH_SCORE) {
    confidenceLevel = "high";
  } else if (best >= 55) {
    confidenceLevel = "medium";
  }

  return { confidence, confidenceLevel };
};
