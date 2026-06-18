export type ScanConfidenceLevel = "high" | "medium" | "low";

export interface ScanRoi {
  key: string; // name, number, hp
  text: string;
  box?: { x: number; y: number; width: number; height: number };
}

export interface ScanParsedFields {
  cardName?: string;
  setCode?: string;
  setNumber?: string;
  setTotal?: string;
  setName?: string;
}

export interface ScanCardCandidate {
  id: string;
  name?: string;
  image?: string;
  localId?: string;
  rarity?: string;
  setName?: string;
  score: number;
}

export interface ScanRecognizeResponse {
  rawText: string;
  lines: string[];
  parsed: ScanParsedFields;
  rois: ScanRoi[];
  candidates: ScanCardCandidate[];
  bestCard: ScanCardCandidate | null;
  confidence: number; // 0 à 1
  confidenceLevel: ScanConfidenceLevel;
  engine: string; // tesseract ou mock
}

export interface ScanRecognizeRequest {
  game?: string;
}
