import type { PokemonCardType, PokemonSetType } from "../types/cardPokemon";
import type { SealedProduct, SealedCondition } from "./sealed-product";
import type { User } from "./auth";

export type CompletionPolicy = "BASE_SET" | "MASTER_SET";

/** A collection visible to the current viewer, including its ownership. */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  user: User;
  created_at: string;
  updatedAt?: string;
  userId?: number;
  items: CollectionItemType[];
  masterSet?: PokemonSetType;
  completionPolicy?: CompletionPolicy;
  completionSnapshot?: Record<string, unknown> | null;
}

/** Common inventory fields; unknown condition must remain unknown. */
export interface CollectionItemBase {
  id: number | null;
  quantity: number;
  collectionId?: string | number;
  added_at?: string;
  cardState?: {
    id: number;
    name: string;
    code?: string;
  } | null;
  variant?: string | null;
  language?: string | null;
  printing?: string | null;
  acquiredAt?: string | null;
  acquisitionCost?: number | null;
  acquisitionCurrency?: string | null;
  storageLocation?: string | null;
  notes?: string | null;
  photoUrls?: string[] | null;
  quantityAvailable?: number;
  quantityReserved?: number;
  quantitySold?: number;
  provenance?: string | null;
}

/** Card inventory, including legacy Master Set placeholders without a discriminator. */
export interface CardCollectionItem extends CollectionItemBase {
  productKind?: "card";
  pokemonCard: PokemonCardType;
  sealedProduct?: null;
  sealedCondition?: null;
}

/** Sealed inventory carries its own catalog identity and packaging condition. */
export interface SealedCollectionItem extends CollectionItemBase {
  productKind: "sealed";
  pokemonCard?: null;
  sealedProduct: SealedProduct;
  sealedCondition?: SealedCondition | null;
}

/** Inventory is either a card or a sealed product, never an assumed card. */
export type CollectionItemType = CardCollectionItem | SealedCollectionItem;

export interface CompletionRarityBreakdown {
  rarity: string;
  totalCards: number;
  ownedDistinctCards: number;
  percentage: number;
}

export interface CollectionCompletion {
  collectionId: string;
  collectionName: string;
  policy: CompletionPolicy;
  totalRequired: number;
  ownedDistinct: number;
  completionPercentage: number;
  duplicatesCount: number;
  totalCopiesOwned: number;
  rarityBreakdown: CompletionRarityBreakdown[];
  isMasterSetCollection: boolean;
  missingCardsCount: number;
}

export interface CardValuationDetail {
  cardId: string;
  name: string;
  rarity?: string;
  quantity: number;
  unitPriceEur?: number;
  unitPriceUsd?: number;
  totalPriceEur?: number;
  totalPriceUsd?: number;
  pricingSource?: string;
}

export interface CollectionValuation {
  currency: string;
  totalEstimatedValue: number;
  totalCopiesCount: number;
  valuedCopiesCount: number;
  unvaluedCopiesCount: number;
  coveragePercentage: number;
  totalAcquisitionCost?: number | null;
  unrealizedGainLoss?: number | null;
  roiPercentage?: number | null;
  sources?: string[];
  computedAt?: string;

  // Compatibility aliases
  collectionId?: string;
  totalItems?: number;
  totalCopies?: number;
  totalValuedCopies?: number;
  totalUnvaluedCopies?: number;
  estimatedValueEur?: number;
  estimatedValueUsd?: number;
  knownAcquisitionCostEur?: number;
  roiEur?: number;
  items?: CardValuationDetail[];
}

export interface ImportResult {
  operationId: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; reason: string }>;
}

/** Outcome of compensating a recorded bulk operation. */
export interface UndoOperationResult {
  operationId: string;
  revertedCount: number;
  removedCount: number;
  /** Deleted items rebuilt from their snapshot, under new identifiers. */
  restoredCount: number;
  conflicts: string[];
}

export interface DeckInventoryRequirements {
  deckId: number;
  deckName: string;
  totalCardsRequired: number;
  totalCopiesOwned: number;
  missingCardsCount: number;
  isPlayable: boolean;
  requirements: Array<{
    cardId: string;
    cardName: string;
    requiredQty: number;
    ownedAvailableQty: number;
    missingQty: number;
    ownedReservedQty: number;
    hasWishlistEntry: boolean;
    availableOffers: Array<{
      listingId: number;
      price: number;
      currency: string;
      cardState: string;
      sellerName: string;
    }>;
  }>;
}
