import type { PokemonSpecies } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";

export type Difficulty = "easy" | "medium" | "hard";

export interface DifficultyConfig {
  labelKey: string;
  descKey: string;
  time: number;
  baseBlur: number;
  minBlur: number;
  brightness: number;
  mult: number;
  distractors: "far" | "mix" | "similar";
  clue: "typegen" | "type" | "none";
  visualMode: "blur" | "silhouette" | "silhouette-glow";
  accent: "green" | "amber" | "red";
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    labelKey: "easy",
    descKey: "easyHelp",
    time: 20,
    baseBlur: 6,
    minBlur: 1.5,
    brightness: 0.95,
    mult: 1,
    distractors: "far",
    clue: "typegen",
    visualMode: "blur",
    accent: "green",
  },
  medium: {
    labelKey: "medium",
    descKey: "mediumHelp",
    time: 15,
    baseBlur: 0,
    minBlur: 0,
    brightness: 0.05,
    mult: 2,
    distractors: "mix",
    clue: "type",
    visualMode: "silhouette-glow",
    accent: "amber",
  },
  hard: {
    labelKey: "hard",
    descKey: "hardHelp",
    time: 10,
    baseBlur: 0,
    minBlur: 0,
    brightness: 0,
    mult: 3,
    distractors: "similar",
    clue: "none",
    visualMode: "silhouette",
    accent: "red",
  },
};

export const TYPE_AURA_COLORS: Record<string, string> = {
  Grass: "#22c55e",
  Plante: "#22c55e",
  Fire: "#f97316",
  Feu: "#f97316",
  Water: "#0ea5e9",
  Eau: "#0ea5e9",
  Lightning: "#eab308",
  Électrique: "#eab308",
  Psychic: "#a855f7",
  Psy: "#a855f7",
  Fighting: "#ea580c",
  Combat: "#ea580c",
  Darkness: "#64748b",
  Obscurité: "#64748b",
  Metal: "#94a3b8",
  Métal: "#94a3b8",
  Dragon: "#6366f1",
  Fairy: "#ec4899",
  Fée: "#ec4899",
  Colorless: "#9ca3af",
  Incolore: "#9ca3af",
};

/**
 * Returns the hex glow color matching a Pokémon energy type for silhouette aura.
 *
 * @param type - Primary Pokémon energy type.
 * @returns Hex color string.
 */
export function getTypeAura(type?: string): string {
  if (!type) return "#3b82f6";
  return TYPE_AURA_COLORS[type] || "#3b82f6";
}

/**
 * Returns the official high-resolution PNG artwork URL with transparent background
 * for a Pokémon species from PokéAPI sprites.
 *
 * @param dexId - Primary National Pokédex number (1 to 1025).
 * @returns Official artwork URL, or null if dexId is missing or invalid.
 */
export function getPokemonOfficialArtwork(dexId?: number): string | null {
  if (!dexId || dexId <= 0 || dexId > 1025) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;
}

/**
 * Compares two Pokémon names ignoring casing, leading/trailing whitespaces,
 * accents, and special punctuation characters (hyphens, spaces).
 *
 * @param a - First Pokémon name.
 * @param b - Second Pokémon name.
 * @returns True if both names refer to the same Pokémon.
 */
export function isNameMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normalize = (val: string) =>
    val
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[-_\s]+/g, " ")
      .trim()
      .toLowerCase();
  return normalize(a) === normalize(b);
}

export const ACCENT_CLASSES: Record<
  DifficultyConfig["accent"],
  { chip: string; icon: string; btn: string }
> = {
  green: {
    chip: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
    icon: "bg-green-500/10 text-green-500",
    btn: "bg-green-500 hover:bg-green-600 text-white",
  },
  amber: {
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: "bg-amber-500/10 text-amber-500",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  red: {
    chip: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
    icon: "bg-red-500/10 text-red-500",
    btn: "bg-red-500 hover:bg-red-600 text-white",
  },
};

/**
 * Returns the Pokémon generation (1 through 9) based on its National Pokédex number.
 *
 * @param dexId - Primary National Pokédex identifier.
 * @returns Generation number (1 to 9), or 0 if unknown.
 */
export function genOf(dexId?: number): number {
  if (!dexId || dexId <= 0) return 0;
  if (dexId <= 151) return 1;
  if (dexId <= 251) return 2;
  if (dexId <= 386) return 3;
  if (dexId <= 493) return 4;
  if (dexId <= 649) return 5;
  if (dexId <= 721) return 6;
  if (dexId <= 809) return 7;
  if (dexId <= 898) return 8;
  return 9;
}

/**
 * Fisher-Yates shuffle algorithm returning a new array copy.
 *
 * @param arr - Array to shuffle.
 * @returns Shuffled array copy.
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Calculates score earned for a correct answer based on remaining time,
 * difficulty multiplier, and current consecutive win streak.
 *
 * @param timeLeft - Remaining seconds when answering.
 * @param totalTime - Total allocated round time.
 * @param multiplier - Difficulty score multiplier.
 * @param streak - Consecutive correct answers count (including current).
 * @returns Total points gained for the round.
 */
export function calculateGain(
  timeLeft: number,
  totalTime: number,
  multiplier: number,
  streak: number,
): number {
  const safeTime = Math.max(0, Math.min(totalTime, timeLeft));
  const speedRatio = totalTime > 0 ? safeTime / totalTime : 0;
  const base = 60 + Math.round(speedRatio * 40);
  const withMult = base * multiplier;
  const streakMultiplier = Math.min(Math.max(0, streak - 1), 5) * 0.1;
  const streakBonus = Math.round(withMult * streakMultiplier);
  return withMult + streakBonus;
}

/**
 * Builds 4 distinct multiple-choice options (1 correct answer + 3 distractors)
 * based on the difficulty configuration.
 *
 * - easy ("far"): distractors sharing neither type nor generation with target.
 * - medium ("mix"): distractors chosen freely across the pool.
 * - hard ("similar"): distractors sharing either the same type or generation.
 *
 * @param target - Target Pokémon card.
 * @param pool - Pool of distinct species drawn from the server.
 * @param cfg - Difficulty configuration.
 * @returns Shuffled array of 4 distinct choices.
 */
export function buildOptions(
  target: { name?: string; types?: string[]; dexId?: number[] },
  pool: PokemonSpecies[],
  cfg: DifficultyConfig,
): string[] {
  const targetName = (target.name || "").trim() || "Pokémon";
  const targetTypes = target.types || [];
  const targetGen = genOf(target.dexId?.[0]);

  const seen = new Set<string>([targetName.toLowerCase()]);
  const uniquePool: PokemonSpecies[] = [];

  for (const s of pool) {
    const name = (s.name || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    uniquePool.push(s);
  }

  const shareType = (s: PokemonSpecies) =>
    (s.types || []).some((t) => targetTypes.includes(t));
  const sameGen = (s: PokemonSpecies) =>
    genOf(s.dexId) === targetGen && targetGen !== 0;

  let candidates: PokemonSpecies[];
  if (cfg.distractors === "similar") {
    candidates = uniquePool.filter((s) => shareType(s) || sameGen(s));
  } else if (cfg.distractors === "far") {
    candidates = uniquePool.filter((s) => !shareType(s) && !sameGen(s));
  } else {
    candidates = uniquePool;
  }

  // Fallback to remaining pool when not enough filtered candidates exist
  if (candidates.length < 3) {
    candidates = uniquePool;
  }

  const pickedNames = shuffle(candidates)
    .slice(0, 3)
    .map((s) => (s.name || "").trim())
    .filter(Boolean);

  return shuffle([targetName, ...pickedNames]);
}

/** Mapping of English Pokémon card energy types to Pokedex translation keys. */
const TYPE_KEY_MAP: Record<string, string> = {
  Grass: "typeGrass",
  Fire: "typeFire",
  Water: "typeWater",
  Lightning: "typeLightning",
  Psychic: "typePsychic",
  Fighting: "typeFighting",
  Darkness: "typeDarkness",
  Metal: "typeMetal",
  Dragon: "typeDragon",
  Fairy: "typeFairy",
  Colorless: "typeColorless",
};

/**
 * Formats clue text (type and/or generation) with localized labels.
 *
 * @param card - Current Pokémon card.
 * @param cfg - Difficulty configuration.
 * @param tPokedex - Translator function for Pokedex namespace.
 * @param tWhos - Translator function for WhosThatPokemon namespace.
 * @returns Localized clue string, or null if no clue is available.
 */
export function formatClue(
  card: PokemonCardType | null,
  cfg: DifficultyConfig | null,
  tPokedex: (key: string) => string,
  tWhos: (key: any, values?: any) => string,
): string | null {
  if (!card || !cfg || cfg.clue === "none") return null;

  const rawTypes = card.types || [];
  const localizedTypes = rawTypes
    .map((t) => {
      const key = TYPE_KEY_MAP[t];
      return key ? tPokedex(key) : t;
    })
    .join(" / ");

  const gen = genOf(card.dexId?.[0]);

  if (cfg.clue === "typegen") {
    const parts: string[] = [];
    if (localizedTypes) {
      parts.push(tWhos("clueType", { type: localizedTypes }));
    }
    if (gen > 0) {
      parts.push(tWhos("generation", { gen }));
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (cfg.clue === "type" && localizedTypes) {
    return tWhos("clueType", { type: localizedTypes });
  }

  return null;
}
