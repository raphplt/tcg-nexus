/** Four corners of the quadrilateral detected in a camera frame. */
export interface CardCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

/** Card-detection result for a frame. */
export interface DetectedCard {
  found: boolean;
  corners?: CardCorners;
  /** Rectangle-detection confidence from 0 to 1. */
  confidence: number;
  /** Width-to-height ratio of the detected rectangle. */
  aspectRatio: number;
}

/** Normalized image after perspective correction. */
export interface RectifiedCard {
  uri: string;
  base64: string;
  width: number; // toujours NORMALIZED_WIDTH
  height: number; // toujours NORMALIZED_HEIGHT
}

/** OCR result for the card-name zone. */
export interface NameZoneResult {
  rawText: string;
  candidateName?: string;
  confidence: number; // 0–1
}

/** OCR result for the card-number zone. */
export interface NumberZoneResult {
  rawText: string;
  localId?: string; // ex: "063"
  setTotal?: string; // ex: "198"
  setCode?: string; // ex: "063/198"
  confidence: number;
}

/** Aggregate ZoneOCR result. */
export interface ZoneOcrResult {
  nameZone: NameZoneResult;
  numberZone: NumberZoneResult;
  language: "fr" | "en" | "ja" | "unknown";
  durationMs: number;
}

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

/** Aggregated signal passed to the ranker. */
export interface ScanSignal {
  ocrName?: string;
  ocrLocalId?: string;
  ocrSetTotal?: string;
  ocrLanguage: string;
  ocrNameConfidence: number;
  ocrNumberConfidence: number;
  visualMatches: VisualMatch[];
}

/** Score breakdown for debugging. */
export interface ScoreBreakdown {
  nameScore: number; // max 40
  numberScore: number; // max 40
  setCoherenceScore: number; // max 15
  visualScore: number; // max 30 (Phase 2)
  total: number;
}

/** Candidate after ranking. */
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

/** Pipeline step log. */
export interface ScanStepLog {
  step: "detect" | "rectify" | "ocr" | "visual" | "rank" | "resolve";
  durationMs: number;
  success: boolean;
  detail: string;
}

export type ScanConfidence = "HIGH" | "MEDIUM" | "LOW";

/** Complete scan-pipeline result. */
export interface ScanResolution {
  /** Best card found, or null when no result is reliable. */
  bestCardId: string | null;
  bestCardName: string | null;
  bestCardImage: string | null;
  bestLocalId: string | null;
  bestSetName: string | null;
  /** Score du meilleur candidat (0–125) */
  topScore: number;
  confidence: ScanConfidence;
  /** All candidates ranked by descending score. */
  rankedCandidates: RankedCandidate[];
  /** Signal OCR brut (pour debug UI) */
  signal: ScanSignal;
  /** Logs for every step, including duration and success. */
  logs: ScanStepLog[];
}

export interface FrameCrop {
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
  screenW: number;
  screenH: number;
}
