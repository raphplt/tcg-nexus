import type { PokemonCardType } from "@/types/cardPokemon";

/**
 * Status of a single comparison check.
 */
export type MatchStatus = "correct" | "incorrect";

/**
 * Directional check status for numeric comparisons (greater/less/equal).
 */
export type DirectionalStatus = "correct" | "higher" | "lower";

/**
 * Category check status for type elements (exact match, cross match, or incorrect).
 */
export type TypeMatchStatus = "correct" | "partial" | "incorrect";

/**
 * Matrix of comparison outcomes evaluated for each submitted guess.
 */
export interface PokedleChecks {
  name: MatchStatus;
  generation: DirectionalStatus;
  dexId: DirectionalStatus;
  type1: TypeMatchStatus;
  type2: TypeMatchStatus;
  hp: DirectionalStatus;
  retreat: DirectionalStatus;
}

/**
 * Evaluated row entry stored in game history.
 */
export interface PokedleGuessRow {
  card: PokemonCardType;
  speciesName: string;
  dexId: number;
  generation: number;
  type1: string;
  type2: string;
  hp: number;
  retreat: number;
  checks: PokedleChecks;
}

/**
 * Wordle-style user statistics stored locally.
 */
export interface PokedleStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  guessesDistribution: Record<number, number>;
  lastPlayedDate?: string;
}

/**
 * Saved daily challenge state for persistence across page refreshes.
 */
export interface PokedleDailyState {
  date: string;
  guesses: PokedleGuessRow[];
  targetCard: PokemonCardType;
  gameState: "playing" | "won" | "lost";
}

export const POKEDLE_MAX_GUESSES = 6;
export const POKEDLE_STATS_KEY = "tcg_pokedle_stats";
export const POKEDLE_DAILY_KEY_PREFIX = "tcg_pokedle_daily_";

/**
 * Returns the Pokémon franchise generation (1 to 9) associated with a National Pokédex number.
 *
 * @param dexId - National Pokédex ID.
 * @returns Generation number between 1 and 9.
 */
export function getGeneration(dexId?: number): number {
  if (!dexId || dexId <= 0) return 1;
  if (dexId <= 151) return 1;
  if (dexId <= 251) return 2;
  if (dexId <= 386) return 3;
  if (dexId <= 493) return 4;
  if (dexId <= 649) return 5;
  if (dexId <= 721) return 6;
  if (dexId <= 809) return 7;
  if (dexId <= 905) return 8;
  return 9;
}

/**
 * Normalizes a Pokémon or card name for species matching.
 * Strips accents, punctuation, and TCG special suffixes (ex, GX, V, VMAX, VSTAR, etc.).
 *
 * @param name - Raw card name.
 * @returns Normalized species base name.
 */
export function normalizeSpeciesName(name?: string): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-\s](ex|gx|v|vmax|vstar|v-union|radiant|mega|prime|break|delta|sp|fb|gl|c|lv\.x)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Builds the official high-resolution transparent artwork image URL for a Pokédex ID.
 *
 * @param dexId - National Pokédex ID.
 * @returns HTTPS URL pointing to the official PokéAPI sprite repository.
 */
export function getOfficialArtworkUrl(dexId?: number): string {
  if (!dexId || dexId <= 0) {
    return "/images/carte-pokemon-dos.jpg";
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;
}

/**
 * Evaluates a player's guess against the mystery target Pokémon card.
 *
 * @param targetCard - The mystery Pokémon card to deduce.
 * @param guessCard - The card chosen by the player.
 * @returns Complete evaluation row with status tags for every column.
 */
export function evaluateGuess(
  targetCard: PokemonCardType,
  guessCard: PokemonCardType,
): PokedleGuessRow {
  const targetDexId = targetCard.dexId?.[0] || 0;
  const guessDexId = guessCard.dexId?.[0] || 0;

  const targetGen = getGeneration(targetDexId);
  const guessGen = getGeneration(guessDexId);

  const targetTypes = (targetCard.types || []).map((t) => t.trim());
  const guessTypes = (guessCard.types || []).map((t) => t.trim());

  const targetType1 = targetTypes[0] || "None";
  const targetType2 = targetTypes[1] || "None";
  const guessType1 = guessTypes[0] || "None";
  const guessType2 = guessTypes[1] || "None";

  const targetHp = targetCard.hp || 60;
  const guessHp = guessCard.hp || 60;

  const targetRetreat = targetCard.retreat ?? 1;
  const guessRetreat = guessCard.retreat ?? 1;

  // Name comparison matches species identity either via Dex ID or normalized name
  const isDexMatch = targetDexId > 0 && guessDexId > 0 && targetDexId === guessDexId;
  const isNameMatch =
    normalizeSpeciesName(targetCard.name) === normalizeSpeciesName(guessCard.name);
  const isCorrectSpecies = isDexMatch || isNameMatch;

  const nameCheck: MatchStatus = isCorrectSpecies ? "correct" : "incorrect";

  // Dex ID numeric comparison
  let dexIdCheck: DirectionalStatus = "correct";
  if (guessDexId < targetDexId) dexIdCheck = "higher";
  else if (guessDexId > targetDexId) dexIdCheck = "lower";

  // Generation numeric comparison
  let genCheck: DirectionalStatus = "correct";
  if (guessGen < targetGen) genCheck = "higher";
  else if (guessGen > targetGen) genCheck = "lower";

  // Type 1 comparison
  let type1Check: TypeMatchStatus = "incorrect";
  if (guessType1 === targetType1) {
    type1Check = "correct";
  } else if (guessType1 !== "None" && guessType1 === targetType2) {
    type1Check = "partial";
  }

  // Type 2 comparison
  let type2Check: TypeMatchStatus = "incorrect";
  if (guessType2 === targetType2) {
    type2Check = "correct";
  } else if (guessType2 !== "None" && guessType2 === targetType1) {
    type2Check = "partial";
  }

  // HP numeric comparison
  let hpCheck: DirectionalStatus = "correct";
  if (guessHp < targetHp) hpCheck = "higher";
  else if (guessHp > targetHp) hpCheck = "lower";

  // Retreat numeric comparison
  let retreatCheck: DirectionalStatus = "correct";
  if (guessRetreat < targetRetreat) retreatCheck = "higher";
  else if (guessRetreat > targetRetreat) retreatCheck = "lower";

  return {
    card: guessCard,
    speciesName: guessCard.name || `#${guessDexId}`,
    dexId: guessDexId,
    generation: guessGen,
    type1: guessType1,
    type2: guessType2,
    hp: guessHp,
    retreat: guessRetreat,
    checks: {
      name: nameCheck,
      generation: genCheck,
      dexId: dexIdCheck,
      type1: type1Check,
      type2: type2Check,
      hp: hpCheck,
      retreat: retreatCheck,
    },
  };
}

/**
 * Maps a single column comparison check into its Wordle emoji representation.
 *
 * @param status - Check status string.
 * @returns Directional or color emoji.
 */
function emojiForCheck(status: MatchStatus | DirectionalStatus | TypeMatchStatus): string {
  switch (status) {
    case "correct":
      return "🟩";
    case "partial":
      return "🟨";
    case "higher":
      return "⬆️";
    case "lower":
      return "⬇️";
    case "incorrect":
    default:
      return "⬛";
  }
}

/**
 * Formats a completed game into a social shareable Wordle emoji grid.
 *
 * @param params - Share parameters including date, mode, and guesses.
 * @returns Formatted clipboard string with emoji tiles.
 */
export function generateShareText(params: {
  date?: string;
  isDaily: boolean;
  guesses: PokedleGuessRow[];
  won: boolean;
  appUrl?: string;
}): string {
  const { date, isDaily, guesses, won, appUrl = "https://tcg-nexus.org/pokemon/mini-games/pokedle" } = params;
  const scoreBadge = won ? `${guesses.length}/${POKEDLE_MAX_GUESSES}` : `X/${POKEDLE_MAX_GUESSES}`;
  const header = isDaily ? `Pokédle du jour ${date || ""} (${scoreBadge})` : `Pokédle (${scoreBadge})`;

  const grid = guesses
    .map((row) => {
      const c = row.checks;
      return [
        emojiForCheck(c.name),
        emojiForCheck(c.generation),
        emojiForCheck(c.dexId),
        emojiForCheck(c.type1),
        emojiForCheck(c.type2),
        emojiForCheck(c.hp),
        emojiForCheck(c.retreat),
      ].join(" ");
    })
    .join("\n");

  return `${header}\n\n${grid}\n\n${appUrl}`;
}

/**
 * Reads user Pokedle statistics from localStorage.
 *
 * @returns Current statistics or default initial state.
 */
export function getPokedleStats(): PokedleStats {
  const defaultStats: PokedleStats = {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessesDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  };

  if (typeof window === "undefined") {
    return defaultStats;
  }

  try {
    const raw = localStorage.getItem(POKEDLE_STATS_KEY);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    return {
      ...defaultStats,
      ...parsed,
      guessesDistribution: {
        ...defaultStats.guessesDistribution,
        ...(parsed.guessesDistribution || {}),
      },
    };
  } catch {
    return defaultStats;
  }
}

/**
 * Records a game conclusion into user statistics and persists to localStorage.
 *
 * @param won - Whether the user guessed the Pokémon within the allowed attempts.
 * @param guessCount - Number of guesses submitted (1 to 6).
 * @param date - Optional game date string for streak calculation.
 * @returns Updated statistics object.
 */
export function recordGameResult(
  won: boolean,
  guessCount: number,
  date?: string,
): PokedleStats {
  const stats = getPokedleStats();
  const today = date || new Date().toISOString().split("T")[0];

  stats.played += 1;

  if (won) {
    stats.won += 1;
    const countClamped = Math.max(1, Math.min(POKEDLE_MAX_GUESSES, guessCount));
    stats.guessesDistribution[countClamped] =
      (stats.guessesDistribution[countClamped] || 0) + 1;

    // Check streak continuity: continuous if last played was yesterday or no previous date
    const lastDate = stats.lastPlayedDate;
    if (lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === yesterdayStr || lastDate === today) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
    } else {
      stats.currentStreak = 1;
    }

    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }
  } else {
    stats.currentStreak = 0;
  }

  stats.lastPlayedDate = today;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(POKEDLE_STATS_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  return stats;
}

/**
 * Retrieves persisted daily game state for a given date.
 *
 * @param date - Date string formatted as YYYY-MM-DD.
 * @returns Saved state or null if not yet started.
 */
export function getDailyState(date: string): PokedleDailyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${POKEDLE_DAILY_KEY_PREFIX}${date}`);
    if (!raw) return null;
    return JSON.parse(raw) as PokedleDailyState;
  } catch {
    return null;
  }
}

/**
 * Persists daily game progress to localStorage.
 *
 * @param state - Daily game state snapshot.
 */
export function saveDailyState(state: PokedleDailyState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${POKEDLE_DAILY_KEY_PREFIX}${state.date}`,
      JSON.stringify(state),
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Calculates remaining hours, minutes, and seconds until next midnight UTC.
 *
 * @returns Object with hours, minutes, and seconds countdown values.
 */
export function getTimeUntilMidnight(): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setUTCHours(24, 0, 0, 0);

  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const diffSec = Math.floor(diffMs / 1000);

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  return { hours, minutes, seconds };
}
