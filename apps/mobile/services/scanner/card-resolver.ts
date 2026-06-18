// ─── Module 6 : CardResolver ──────────────────────────────────────────────────
// Orchestre les 5 modules précédents et produit le ScanResolution final.
// C'est le seul point d'entrée du pipeline depuis l'UI.

import { api } from "@/services/api";
import { cardDetector } from "./card-detector";
import { perspectiveCorrector } from "./card-detector";
import { zoneOcr } from "./zone-ocr";
import { visualMatcher } from "./visual-matcher";
import { candidateRanker } from "./candidate-ranker";
import { SCANNER_CONFIG } from "./config";

import type { CardSearchResult } from "@/types";
import type {
  FrameCrop,
  ScanResolution,
  ScanSignal,
  ScanStepLog,
  RankedCandidate,
} from "@/types/scanner";

const log = (
  logs: ScanStepLog[],
  step: ScanStepLog["step"],
  t0: number,
  success: boolean,
  detail: string,
) => {
  const entry: ScanStepLog = {
    step,
    durationMs: Date.now() - t0,
    success,
    detail,
  };
  logs.push(entry);
  console.log(`[CardResolver:${step}] ${detail} (${entry.durationMs}ms)`);
};

/** Appelle l'API pour récupérer les candidats textuels */
const fetchCandidates = async (
  signal: ScanSignal,
): Promise<CardSearchResult[]> => {
  const params: Record<string, string> = {};
  if (signal.ocrName) params.cardName = signal.ocrName;
  if (signal.ocrLocalId) params.localId = signal.ocrLocalId;
  if (signal.ocrSetTotal) params.setTotal = signal.ocrSetTotal;

  // Appel à l'endpoint scan-match existant
  const res = await api.post<{ card: CardSearchResult; score: number }[]>(
    "/pokemon-card/scan-match",
    params,
  );
  return (res.data ?? []).map((c) => c.card);
};

export const cardResolver = {
  /**
   * Pipeline complet de scan :
   * detect → rectify → ocr → visual → rank → resolve
   */
  async resolve(
    photoUri: string,
    frameCrop: FrameCrop,
  ): Promise<ScanResolution> {
    const logs: ScanStepLog[] = [];
    let t0: number;

    // ── Étape 1 : Détection ───────────────────────────────────────────────────
    t0 = Date.now();
    const detected = cardDetector.detect(frameCrop);
    log(
      logs,
      "detect",
      t0,
      detected.found,
      `found=${detected.found} ratio=${detected.aspectRatio} confidence=${detected.confidence}`,
    );

    // ── Étape 2 : Rectification ───────────────────────────────────────────────
    t0 = Date.now();
    let rectified;
    try {
      rectified = await perspectiveCorrector.rectify(photoUri, frameCrop);
      log(
        logs,
        "rectify",
        t0,
        true,
        `${rectified.width}×${rectified.height}px`,
      );
    } catch (e) {
      log(logs, "rectify", t0, false, String(e));
      return emptyResolution(
        logs,
        "Impossible de normaliser l'image capturée.",
      );
    }

    // ── Étape 3 : OCR ciblé (2 zones) ────────────────────────────────────────
    t0 = Date.now();
    let ocrResult;
    try {
      ocrResult = await zoneOcr.extract(rectified);
      log(
        logs,
        "ocr",
        t0,
        true,
        `name="${ocrResult.nameZone.candidateName ?? "?"}" ` +
          `localId="${ocrResult.numberZone.localId ?? "?"}" ` +
          `lang=${ocrResult.language}`,
      );
    } catch (e) {
      log(logs, "ocr", t0, false, String(e));
      return emptyResolution(
        logs,
        "OCR échoué — vérifier la clé Google Vision.",
      );
    }

    // ── Étape 4 : VisualMatcher (Phase 2 stub) ────────────────────────────────
    t0 = Date.now();
    const visualResult = await visualMatcher.match(rectified.base64);
    log(
      logs,
      "visual",
      t0,
      true,
      `method=${visualResult.method} matches=${visualResult.topMatches.length}`,
    );

    // ── Construction du signal ────────────────────────────────────────────────
    const signal: ScanSignal = {
      ocrName: ocrResult.nameZone.candidateName,
      ocrLocalId: ocrResult.numberZone.localId,
      ocrSetTotal: ocrResult.numberZone.setTotal,
      ocrLanguage: ocrResult.language,
      ocrNameConfidence: ocrResult.nameZone.confidence,
      ocrNumberConfidence: ocrResult.numberZone.confidence,
      visualMatches: visualResult.topMatches,
    };

    // Pas de signal du tout → on ne peut pas chercher
    if (
      !signal.ocrName &&
      !signal.ocrLocalId &&
      visualResult.topMatches.length === 0
    ) {
      log(
        logs,
        "rank",
        Date.now(),
        false,
        "Aucun signal OCR ni visuel disponible",
      );
      return emptyResolution(
        logs,
        "Aucun texte détecté. Repositionne la carte.",
      );
    }

    // ── Étape 5 : Fetch candidats + Ranking ───────────────────────────────────
    t0 = Date.now();
    let candidates: CardSearchResult[] = [];
    try {
      candidates = await fetchCandidates(signal);
      log(logs, "rank", t0, true, `${candidates.length} candidats récupérés`);
    } catch (e) {
      log(logs, "rank", t0, false, `API scan-match échouée: ${String(e)}`);
    }

    const ranked: RankedCandidate[] = candidateRanker.rank(candidates, signal);

    // ── Étape 6 : Résolution finale ───────────────────────────────────────────
    t0 = Date.now();
    const best = ranked[0] ?? null;
    const topScore = best?.score ?? 0;
    const confidence = best?.confidence ?? "LOW";

    log(
      logs,
      "resolve",
      t0,
      best !== null,
      best
        ? `"${best.cardName}" score=${topScore} confidence=${confidence}`
        : "Aucun candidat avec score > 0",
    );

    return {
      bestCardId: best?.cardId ?? null,
      bestCardName: best?.cardName ?? null,
      bestCardImage: best?.image ?? null,
      bestLocalId: best?.localId ?? null,
      bestSetName: best?.setName ?? null,
      topScore,
      confidence,
      rankedCandidates: ranked,
      signal,
      logs,
    };
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const emptyResolution = (
  logs: ScanStepLog[],
  reason: string,
): ScanResolution => ({
  bestCardId: null,
  bestCardName: null,
  bestCardImage: null,
  bestLocalId: null,
  bestSetName: null,
  topScore: 0,
  confidence: "LOW",
  rankedCandidates: [],
  signal: {
    ocrLanguage: "unknown",
    ocrNameConfidence: 0,
    ocrNumberConfidence: 0,
    visualMatches: [],
  },
  logs: [
    ...logs,
    {
      step: "resolve",
      durationMs: 0,
      success: false,
      detail: reason,
    },
  ],
});
