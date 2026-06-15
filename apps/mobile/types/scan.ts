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
  id: number;
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
