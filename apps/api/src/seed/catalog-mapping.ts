import { EnergyType } from "src/common/enums/energyType";
import { PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { TrainerType } from "src/common/enums/trainerType";

/**
 * Normalizes a string meant for storage: canonical Unicode form, trimmed.
 * Accents are preserved — "Pokémon" must stay "Pokémon" in the database.
 *
 * @param str Raw string.
 * @returns Normalized string.
 */
export function cleanString(str: string): string {
  return str.normalize("NFC").trim();
}

/**
 * Normalizes a string in order to *compare* it against a known value. Losing
 * accents and case is intentional here; never use it for a stored value.
 *
 * @param value Raw string.
 * @returns Comparable, accent-free lowercase string.
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
 * TCGdex labels are translated, so the mapping accepts both the French and
 * English wording and resolves them to the same enum value.
 *
 * @param value Raw category label.
 * @returns Matching enum value, or undefined when unknown.
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
