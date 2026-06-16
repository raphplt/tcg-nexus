import type {
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanParsedFields,
} from "@repo/scan-contract";
import type { Card } from "../../card/entities/card.entity";
import { jaroWinkler } from "./similarity";

const NAME_W = 0.55;
const NUMBER_W = 0.3;
const SET_W = 0.15;

export const STRONG_MATCH_SCORE = 0.85;

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

export const scoreCard = (
  card: Card,
  fields: ScanParsedFields,
  nameCandidates?: string[],
): number => {
  const candidates = nameCandidates?.length
    ? nameCandidates
    : fields.cardName
      ? [fields.cardName]
      : [];
  const cardNameNorm = normalize(card.name);
  const name = candidates.length
    ? Math.max(
        ...candidates.map((c) => jaroWinkler(normalize(c), cardNameNorm)),
      )
    : 0;

  const numberExact = sameNumber(card.localId, fields.setNumber);
  // le dénominateur imprimé (ex. /182) = cardCountOfficial, pas le total réel
  const totalKnown = Boolean(fields.setTotal);
  const cardCount = card.set?.cardCount;
  const totalExact =
    totalKnown &&
    (String(cardCount?.official ?? "") === fields.setTotal ||
      String(cardCount?.total ?? "") === fields.setTotal);

  let numberSignal = 0;
  if (numberExact) {
    if (totalExact)
      numberSignal = 1; // bon numéro ET bonne série
    else if (!totalKnown) numberSignal = 0.5; // numéro seul : simple indice
    // total connu mais série différente -> coïncidence, on ne crédite pas
  }

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
