// ─── Types partagés entre UI et services ─────────────────────────────────────
// Tous les types spécifiques au pipeline scanner sont dans types/scanner.ts.
// Ce fichier conserve uniquement les types UI et BDD génériques.

export interface CardSetSummary {
  id?: string;
  name?: string;
  logo?: string;
  symbol?: string;
}

export interface PokemonAbility {
  type?: string;
  name?: string;
  effect?: string;
}

export interface PokemonAttack {
  cost?: string[];
  name?: string;
  effect?: string;
  damage?: string | number;
}

export interface CardDetails {
  hp?: number;
  types?: string[];
  stage?: string;
  description?: string;
  abilities?: PokemonAbility[];
  attacks?: PokemonAttack[];
}

export interface CardSearchResult {
  id: string;
  name?: string;
  image?: string;
  localId?: string;
  rarity?: string;
  category?: string;
  updated?: string;
  set?: CardSetSummary;
  pokemonDetails?: CardDetails;
}

export interface CollectionItem {
  id: number | null;
  quantity: number;
  added_at?: string;
  pokemonCard?: CardSearchResult | null;
}

export interface UserCollection {
  id: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  created_at?: string;
  updated_at?: string;
  items?: CollectionItem[];
  masterSet?: { id: string; name: string } | null;
}

export interface CollectionItemResponse {
  id: number;
  quantity: number;
  pokemonCard?: CardSearchResult | null;
}

export interface CollectionItemsPaginatedResponse {
  data: CollectionItem[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type ScanStatus = "found" | "not-found" | "added" | "error";

export interface ScanHistoryItem {
  id: string;
  status: ScanStatus;
  title: string;
  message: string;
  createdAt: number;
}

export type {
  ScanCardCandidate,
  ScanConfidenceLevel,
  ScanParsedFields,
  ScanRecognizeResponse,
  ScanRoi,
} from "@repo/scan-contract";

export interface PokemonSerieType {
  id: string;
  name: string;
  logo?: string;
}

export interface PokemonSetType {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  serie?: PokemonSerieType;
}
