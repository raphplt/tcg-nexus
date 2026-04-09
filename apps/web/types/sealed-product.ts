import { PokemonSetType } from "./cardPokemon";

export enum SealedProductType {
  BOOSTER = "booster",
  DISPLAY = "display",
  ETB = "etb",
  BOX = "box",
  TIN = "tin",
  DECK = "deck",
  TRIPACK = "tripack",
  COLLECTION_BOX = "collection_box",
  PORTFOLIO = "portfolio",
  OTHER = "other",
}

export enum ProductKind {
  CARD = "card",
  SEALED = "sealed",
}

export enum SealedCondition {
  SEALED = "sealed",
  BOX_DAMAGED = "box_damaged",
  OPENED_RESEALED = "opened_resealed",
}

export interface SealedProductLocale {
  id: number;
  locale: string;
  name: string;
}

export interface SealedProductContents {
  boosterCount?: number;
  promos?: string[];
  accessories?: boolean;
  [key: string]: unknown;
}

export interface SealedProduct {
  id: string;
  nameEn: string;
  productType: SealedProductType;
  pokemonSet?: PokemonSetType | null;
  contents?: SealedProductContents | null;
  sku?: string;
  upc?: string;
  /** Chemin relatif dans R2, ex : "pokecardex/AQ/Booster_Aquapolis_Arcanin.png" */
  image?: string;
  locales?: SealedProductLocale[];
  createdAt: string;
  updatedAt: string;
}

export const sealedProductTypeLabels: Record<SealedProductType, string> = {
  [SealedProductType.BOOSTER]: "Booster",
  [SealedProductType.DISPLAY]: "Display",
  [SealedProductType.ETB]: "Elite Trainer Box",
  [SealedProductType.BOX]: "Coffret",
  [SealedProductType.TIN]: "Tin",
  [SealedProductType.DECK]: "Deck",
  [SealedProductType.TRIPACK]: "Tripack",
  [SealedProductType.COLLECTION_BOX]: "Collection Box",
  [SealedProductType.PORTFOLIO]: "Portfolio",
  [SealedProductType.OTHER]: "Autre",
};

export const sealedConditionLabels: Record<SealedCondition, string> = {
  [SealedCondition.SEALED]: "Scellé d'usine",
  [SealedCondition.BOX_DAMAGED]: "Boîte abîmée",
  [SealedCondition.OPENED_RESEALED]: "Ouvert puis re-scellé",
};
