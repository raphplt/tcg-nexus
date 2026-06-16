import type {
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanParsedFields,
} from "@repo/scan-contract";
import type { Card } from "../../card/entities/card.entity";
import { jaroWinkler } from "./similarity";

// poids des signaux dans le score 0..1
const NAME_W = 0.55;
const NUMBER_W = 0.3;
const SET_W = 0.15;

// au-delà, correspondance assez sûre pour court-circuiter la recherche
export const STRONG_MATCH_SCORE = 0.85;

const normalize = (value?: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// score 0..1 : nom fuzzy + numéro exact (bonus dénominateur) + set fuzzy
export const scoreCard = (card: Card, fields: ScanParsedFields): number => {
  const name = fields.cardName
    ? jaroWinkler(normalize(fields.cardName), normalize(card.name))
    : 0;

  const numberExact =
    Boolean(fields.setNumber) &&
    normalize(card.localId) === normalize(fields.setNumber);
  const totalExact =
    numberExact &&
    Boolean(fields.setTotal) &&
    String(card.set?.cardCount?.total ?? "") === fields.setTotal;
  const numberSignal = numberExact ? (totalExact ? 1 : 0.85) : 0;

  const setSignal =
    fields.setName && card.set?.name
      ? jaroWinkler(normalize(fields.setName), normalize(card.set.name))
      : 0;

  return NAME_W * name + NUMBER_W * numberSignal + SET_W * setSignal;
};

export const toCandidate = (card: Card, score: number): ScanCardCandidate => ({
  id: card.id,
  name: card.name,
  image: card.image,
  localId: card.localId,
  rarity: card.rarity,
  setName: card.set?.name,
  score: Number(score.toFixed(3)),
});

export const computeConfidence = (
  candidates: ScanCardCandidate[],
): { confidence: number; confidenceLevel: ScanConfidenceLevel } => {
  const best = candidates[0]?.score ?? 0;
  const second = candidates[1]?.score ?? 0;

  let confidenceLevel: ScanConfidenceLevel =
    best >= 0.75 ? "high" : best >= 0.45 ? "medium" : "low";

  // deux candidats au coude-à-coude (homonyme, set multiple) -> on fait confirmer
  if (confidenceLevel === "high" && best - second < 0.08) {
    confidenceLevel = "medium";
  }

  return { confidence: Number(best.toFixed(3)), confidenceLevel };
};
