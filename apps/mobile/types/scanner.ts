// ─── Types du pipeline scanner ────────────────────────────────────────────────
// Interfaces entre chaque module du pipeline.
// Aucune dépendance vers l'ancien OCR.

// ── Module 1 : CardDetector ───────────────────────────────────────────────────

/** Les 4 coins du quadrilatère détecté dans le frame caméra */
export interface CardCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

/** Résultat de la détection de carte dans un frame */
export interface DetectedCard {
  found: boolean;
  corners?: CardCorners;
  /** 0–1 : confiance sur la détection du rectangle */
  confidence: number;
  /** Ratio largeur/hauteur du rectangle détecté */
  aspectRatio: number;
}

// ── Module 2 : PerspectiveCorrector ──────────────────────────────────────────

/** Image normalisée après correction de perspective */
export interface RectifiedCard {
  uri: string;
  base64: string;
  width: number; // toujours NORMALIZED_WIDTH
  height: number; // toujours NORMALIZED_HEIGHT
}

// ── Module 3 : ZoneOCR ───────────────────────────────────────────────────────

/** Résultat OCR de la zone nom (haut de la carte) */
export interface NameZoneResult {
  rawText: string;
  candidateName?: string; // première ligne valide, nettoyée
  confidence: number; // 0–1
}

/** Résultat OCR de la zone numéro (bas de la carte) */
export interface NumberZoneResult {
  rawText: string;
  localId?: string; // ex: "063"
  setTotal?: string; // ex: "198"
  setCode?: string; // ex: "063/198"
  confidence: number;
}

/** Résultat global du ZoneOCR */
export interface ZoneOcrResult {
  nameZone: NameZoneResult;
  numberZone: NumberZoneResult;
  language: "fr" | "en" | "ja" | "unknown";
  durationMs: number;
}

// ── Module 4 : VisualMatcher ─────────────────────────────────────────────────

export type VisualMatchMethod = "phash" | "none";

export interface VisualMatch {
  cardId: string;
  similarity: number; // 0–1
}

export interface VisualMatchResult {
  method: VisualMatchMethod;
  topMatches: VisualMatch[];
  durationMs: number;
}

// ── Module 5 : CandidateRanker ────────────────────────────────────────────────

/** Signal agrégé passé au ranker */
export interface ScanSignal {
  ocrName?: string;
  ocrLocalId?: string;
  ocrSetTotal?: string;
  ocrLanguage: string;
  ocrNameConfidence: number;
  ocrNumberConfidence: number;
  visualMatches: VisualMatch[];
}

/** Décomposition du score pour debug */
export interface ScoreBreakdown {
  nameScore: number; // max 40
  numberScore: number; // max 40
  setCoherenceScore: number; // max 15
  visualScore: number; // max 30 (Phase 2)
  total: number;
}

/** Candidat après ranking */
export interface RankedCandidate {
  cardId: string;
  cardName: string;
  localId: string;
  setName: string;
  image?: string;
  score: number;
  breakdown: ScoreBreakdown;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

// ── Module 6 : CardResolver ──────────────────────────────────────────────────

/** Log d'une étape du pipeline */
export interface ScanStepLog {
  step: "detect" | "rectify" | "ocr" | "visual" | "rank" | "resolve";
  durationMs: number;
  success: boolean;
  detail: string;
}

export type ScanConfidence = "HIGH" | "MEDIUM" | "LOW";

/** Résultat final complet du pipeline de scan */
export interface ScanResolution {
  /** Meilleure carte trouvée (ou null si rien de fiable) */
  bestCardId: string | null;
  bestCardName: string | null;
  bestCardImage: string | null;
  bestLocalId: string | null;
  bestSetName: string | null;
  /** Score du meilleur candidat (0–125) */
  topScore: number;
  confidence: ScanConfidence;
  /** Tous les candidats classés par score décroissant */
  rankedCandidates: RankedCandidate[];
  /** Signal OCR brut (pour debug UI) */
  signal: ScanSignal;
  /** Logs de chaque étape (durées, succès) */
  logs: ScanStepLog[];
}

// ── FrameCrop (passé depuis l'UI) ─────────────────────────────────────────────

export interface FrameCrop {
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
  screenW: number;
  screenH: number;
}
