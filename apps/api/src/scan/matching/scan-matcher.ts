import type {
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanParsedFields,
} from "@repo/scan-contract";
import type { Card } from "../../card/entities/card.entity";
import { jaroWinkler } from "./similarity";

const NAME_W = 0.55;
const NUMBER_W = 0.5;
const SET_W = 0.15;
const NAME_MARGIN = 0.2;
const NAME_INFORMATIVE = 0.5;
const UNIQUE_MARGIN = 0.12;

const normalize = (value?: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sameNumber = (a?: string, b?: string): boolean => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ia = Number(na);
  const ib = Number(nb);
  return !Number.isNaN(ia) && ia === ib;
};

/**
 * Calculates highest name similarity score (0..1) across OCR candidates.
 *
 * @param card Database card entity.
 * @param nameCandidates Candidate strings extracted via OCR.
 * @returns Similarity score between 0 and 1.
 */
export const nameScore = (card: Card, nameCandidates?: string[]): number => {
  const cands = (nameCandidates ?? []).filter((c) => c.length >= 4);
  if (!cands.length) return 0;
  const cardNameNorm = normalize(card.name);
  return Math.max(...cands.map((c) => jaroWinkler(normalize(c), cardNameNorm)));
};

/**
 * Scores a candidate card against parsed scan fields using name, set number, and set name metrics.
 *
 * @param card Database card entity.
 * @param fields Parsed OCR fields.
 * @param nameCandidates OCR name candidate list.
 * @param bestName Highest name match score across all cards for guardrail comparison.
 * @returns Composite match score.
 */
export const scoreCard = (
  card: Card,
  fields: ScanParsedFields,
  nameCandidates?: string[],
  bestName = 0,
): number => {
  const name = nameCandidates?.length
    ? nameScore(card, nameCandidates)
    : fields.cardName
      ? jaroWinkler(normalize(fields.cardName), normalize(card.name))
      : 0;

  const numberExact = sameNumber(card.localId, fields.setNumber);
  // Printed total count (e.g. /182) equals cardCountOfficial, not the total set size
  const totalKnown = Boolean(fields.setTotal);
  const cardCount = card.set?.cardCount;
  const totalExact =
    totalKnown &&
    (String(cardCount?.official ?? "") === fields.setTotal ||
      String(cardCount?.total ?? "") === fields.setTotal);

  let numberSignal = 0;
  if (numberExact && totalExact) numberSignal = 1;
  else if (numberExact && !totalKnown) numberSignal = 0.5;

  // Discard accidental number coincidence if another card matches the name far better
  const nameInformative = bestName >= NAME_INFORMATIVE;
  if (numberSignal > 0 && nameInformative && bestName - name > NAME_MARGIN) {
    numberSignal = 0;
  }

  const setSignal =
    fields.setName && card.set?.name
      ? jaroWinkler(normalize(fields.setName), normalize(card.set.name))
      : 0;

  return NAME_W * name + NUMBER_W * numberSignal + SET_W * setSignal;
};

/**
 * Maps a card entity and match score to a ScanCardCandidate structure.
 *
 * @param card Card entity.
 * @param score Match score.
 * @returns Candidate object.
 */
export const toCandidate = (card: Card, score: number): ScanCardCandidate => ({
  id: card.id,
  name: card.name,
  image: card.image,
  localId: card.localId,
  rarity: card.rarity,
  setName: card.set?.name,
  score: Number(score.toFixed(3)),
});

/**
 * Computes overall confidence score and confidence level ("high", "medium", "low") from candidate rankings.
 *
 * @param candidates Ranked list of card candidates.
 * @returns Object containing confidence score and level.
 */
export const computeConfidence = (
  candidates: ScanCardCandidate[],
): { confidence: number; confidenceLevel: ScanConfidenceLevel } => {
  const best = candidates[0]?.score ?? 0;
  const second = candidates[1]?.score ?? 0;

  let confidenceLevel: ScanConfidenceLevel =
    best >= 0.75 ? "high" : best >= 0.45 ? "medium" : "low";

  // High confidence boost when name match is near-exact and distinctly unique
  if (
    confidenceLevel === "medium" &&
    best >= 0.5 &&
    best - second >= UNIQUE_MARGIN
  ) {
    confidenceLevel = "high";
  }

  // Demote confidence level when top two candidates have near identical scores
  if (confidenceLevel === "high" && best - second < 0.08) {
    confidenceLevel = "medium";
  }

  // Cap output confidence value to 1.0
  return {
    confidence: Number(Math.min(1, best).toFixed(3)),
    confidenceLevel,
  };
};
