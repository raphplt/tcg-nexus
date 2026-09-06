import type { PokemonCardType, PokemonSetType } from "../types/cardPokemon";
import type { SealedProduct, SealedCondition } from "./sealed-product";
import type { User } from "./auth";

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
}

/** Common inventory fields; unknown condition must remain unknown. */
interface CollectionItemBase {
  id: number | null;
  quantity: number;
  collectionId?: string | number;
  added_at?: string;
  cardState?: {
    id: number;
    name: string;
    code?: string;
  } | null;
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
