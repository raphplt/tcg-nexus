import { CardState } from "@/utils/enums";
import { User } from "./auth";
import { PokemonCardType } from "./cardPokemon";

export interface Listing {
  id: number;
  seller: User;
  pokemonCard: PokemonCardType;
  price: number;
  currency: string;
  quantityAvailable: number;
  cardState: CardState;
  createdAt: Date;
  expiresAt: Date;
}

export enum Rarity {
  COMMUNE = "Commune",
  PEU_COMMUNE = "Peu Commune",
  BRILLANT = "Brillant",
  HOLOGRAPHIQUE = "Holographique",
  RARETÉ_LÉGENDE = "Rareté Légende",
  MAGNIFIQUE_RARE = "Magnifique Rare",
  DOUBLE_RARE = "Double Rare",
  RARE = "Rare",
  RARE_HOLO = "Rare Holo",
  ULTRA_RARE = "Ultra Rare",
  ILLUSTRATION_RARE = "Illustration Rare",
  ILLUSTRATION_SPÉCIALE_RARE = "Illustration Spéciale Rare",
  HYPER_RARE = "Hyper Rare",
  CHROMATIQUE_RARE = "Chromatique Rare",
  CHROMATIQUE_ULTRA_RARE = "Chromatique Ultra Rare",
  HIGH_TECH_RARE = "High Tech Rare",
}
