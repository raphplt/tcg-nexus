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

// meilleur match de nom de la carte parmi les lectures OCR possibles (0..1).
export const nameScore = (card: Card, nameCandidates?: string[]): number => {
  const cands = (nameCandidates ?? []).filter((c) => c.length >= 4);
  if (!cands.length) return 0;
  const cardNameNorm = normalize(card.name);
  return Math.max(...cands.map((c) => jaroWinkler(normalize(c), cardNameNorm)));
};

export const scoreCard = (
  card: Card,
  fields: ScanParsedFields,
  nameCandidates?: string[],
  // meilleur score de nom parmi TOUS les candidats cartes (pour le garde-fou relatif)
  bestName = 0,
): number => {
  const name = nameCandidates?.length
    ? nameScore(card, nameCandidates)
    : fields.cardName
      ? jaroWinkler(normalize(fields.cardName), normalize(card.name))
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
  if (numberExact && totalExact) numberSignal = 1;
  else if (numberExact && !totalKnown) numberSignal = 0.5;

  // garde-fou relatif : si un nom est exploitable mais qu'une autre carte le
  // matche bien mieux, le numéro de celle-ci est une coïncidence -> on l'écarte.
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

  // P3 : nom quasi-exact (score >= 0.5 ~ name >= 0.9) ET candidat nettement
  // unique -> on promeut en high même sans numéro lu (titres holo/ex où le
  // numéro échoue). La marge stricte évite de promouvoir une variante en doublon.
  if (
    confidenceLevel === "medium" &&
    best >= 0.5 &&
    best - second >= UNIQUE_MARGIN
  ) {
    confidenceLevel = "high";
  }

  // deux candidats au coude-à-coude (homonyme, set multiple) -> on fait confirmer
  if (confidenceLevel === "high" && best - second < 0.08) {
    confidenceLevel = "medium";
  }

  // P1 : la confiance affichée est bornée à 1 (le score brut peut monter à 1.2)
  return {
    confidence: Number(Math.min(1, best).toFixed(3)),
    confidenceLevel,
  };
};
