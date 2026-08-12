import { EnergyType } from "src/common/enums/energyType";
import { PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { TrainerType } from "src/common/enums/trainerType";

/**
 * Normalise une chaîne destinée au stockage : forme Unicode canonique et
 * espaces superflus supprimés. Les accents sont conservés — « Pokémon » doit
 * rester « Pokémon » en base.
 */
export function cleanString(str: string): string {
  return str.normalize("NFC").trim();
}

/**
 * Normalise une chaîne pour la *comparer* à une valeur connue. La perte des
 * accents et de la casse est voulue ici ; ne jamais utiliser pour une valeur
 * stockée.
 */
export function normalizeForMapping(value?: string): string {
  if (!value) return "";
  return (
    value
      .normalize("NFKD")
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, "")
      .toLowerCase()
      .trim()
  );
}

/**
 * Les libellés TCGdex sont traduits ; le mapping accepte donc les variantes
 * française et anglaise pour aboutir à la même valeur d'enum.
 */
export function mapPokemonCategory(
  value?: string,
): PokemonCardsType | undefined {
  switch (normalizeForMapping(value)) {
    case "pokemon":
      return PokemonCardsType.Pokemon;
    case "energie":
    case "energy":
      return PokemonCardsType.Energy;
    case "dresseur":
    case "trainer":
      return PokemonCardsType.Trainer;
    default:
      return undefined;
  }
}

export function mapTrainerType(value?: string): TrainerType | undefined {
  switch (normalizeForMapping(value)) {
    case "supporter":
      return TrainerType.Supporter;
    case "objet":
    case "item":
      return TrainerType.Item;
    case "stade":
    case "stadium":
      return TrainerType.Stadium;
    case "outil":
    case "tool":
      return TrainerType.Tool;
    case "machine technique":
    case "technical machine":
      return TrainerType.TechnicalMachine;
    default:
      return undefined;
  }
}

export function mapEnergyType(value?: string): EnergyType | undefined {
  switch (normalizeForMapping(value)) {
    case "de base":
    case "basic":
      return EnergyType.Basic;
    case "special":
    case "speciale":
    case "speciales":
    case "special energy":
    case "speciale energie":
    case "specialeenergie":
      return EnergyType.Special;
    default:
      return undefined;
  }
}
