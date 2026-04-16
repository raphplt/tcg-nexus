export interface CardSetSummary {
  id?: string;
  name?: string;
}

export interface CardSearchResult {
  id: string;
  name?: string;
  image?: string;
  localId?: string;
  rarity?: string;
  set?: CardSetSummary;
}

export interface UserCollection {
  id: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  items?: unknown[];
}

export interface CollectionItemResponse {
  id: number;
  quantity: number;
  pokemonCard?: CardSearchResult | null;
}

export interface OcrParsedResult {
  rawText: string;
  lines: string[];
  cardName?: string;
  setCode?: string;
  setNumber?: string;
  setTotal?: string;
  setName?: string;
  searchHints: string[];
}

export type ScanStatus = "found" | "not-found" | "added" | "error";

export interface ScanHistoryItem {
  id: string;
  status: ScanStatus;
  title: string;
  message: string;
  createdAt: number;
}

export interface ProcessedImagePayload {
  optimizedUri: string;
  base64: string;
}

export interface CardSearchResolution {
  bestCard: CardSearchResult | null;
  candidates: CardSearchResult[];
  searchedTerms: string[];
}
