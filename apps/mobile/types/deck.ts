import { User } from "./auth";
import { CardSearchResult } from "./scan";

export interface DeckFormat {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
}

export interface PaginatedResult<T> {
  data: T[];
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

export type DeckCardRole = "main" | "side";

export interface DeckCard {
  id?: number;
  qty: number;
  deck?: Deck;
  role: DeckCardRole;
  card?: CardSearchResult;
}

export interface Deck {
  id: number;
  name: string;
  user: User;
  format: DeckFormat;
  isPublic: boolean;
  views: number;
  coverCard?: {
    image: string;
    name: string;
  };
  cards?: DeckCard[];
  createdAt: string;
  updatedAt?: string;
}

export interface DistributionEntry {
  label: string;
  count: number;
  percentage: number;
}

export interface AttackCostDistribution {
  cost: number;
  count: number;
  percentage: number;
}

export interface DuplicateCardIssue {
  cardId: string;
  cardName: string;
  qty: number;
}

export interface MissingCardSuggestion {
  label: string;
  reason: string;
  recommendedQty: number;
}

export interface DeckAnalysis {
  deckId: number;
  totalCards: number;
  pokemonCount: number;
  energyCount: number;
  trainerCount: number;
  energyToPokemonRatio: number;
  averageEnergyCost: number;
  typeDistribution: DistributionEntry[];
  categoryDistribution: DistributionEntry[];
  attackCostDistribution: AttackCostDistribution[];
  duplicates: DuplicateCardIssue[];
  warnings: string[];
  suggestions: string[];
  missingCards: MissingCardSuggestion[];
}

export interface DecksQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  formatId?: number;
  userId?: number;
  currency?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface DeckExportCardJson {
  tcgDexId: string;
  name: string;
  qty: number;
  role: string;
}

export interface DeckExportJson {
  name: string;
  format: string;
  isPublic?: boolean;
  cards: DeckExportCardJson[];
}
