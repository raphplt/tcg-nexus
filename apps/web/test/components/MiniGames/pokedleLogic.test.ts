import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getGeneration,
  normalizeSpeciesName,
  getOfficialArtworkUrl,
  evaluateGuess,
  generateShareText,
  getPokedleStats,
  recordGameResult,
  getDailyState,
  saveDailyState,
  getTimeUntilMidnight,
  POKEDLE_STATS_KEY,
  POKEDLE_DAILY_KEY_PREFIX,
} from "@/components/MiniGames/Pokedle/pokedleLogic";
import type { PokemonCardType } from "@/types/cardPokemon";

describe("pokedleLogic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getGeneration", () => {
    it("returns correct generation across Pokédex thresholds", () => {
      expect(getGeneration(undefined)).toBe(1);
      expect(getGeneration(0)).toBe(1);
      expect(getGeneration(1)).toBe(1);
      expect(getGeneration(151)).toBe(1);
      expect(getGeneration(152)).toBe(2);
      expect(getGeneration(251)).toBe(2);
      expect(getGeneration(252)).toBe(3);
      expect(getGeneration(386)).toBe(3);
      expect(getGeneration(387)).toBe(4);
      expect(getGeneration(493)).toBe(4);
      expect(getGeneration(494)).toBe(5);
      expect(getGeneration(649)).toBe(5);
      expect(getGeneration(650)).toBe(6);
      expect(getGeneration(721)).toBe(6);
      expect(getGeneration(722)).toBe(7);
      expect(getGeneration(809)).toBe(7);
      expect(getGeneration(810)).toBe(8);
      expect(getGeneration(905)).toBe(8);
      expect(getGeneration(906)).toBe(9);
      expect(getGeneration(1025)).toBe(9);
    });
  });

  describe("normalizeSpeciesName", () => {
    it("strips accents, punctuation and special TCG tags", () => {
      expect(normalizeSpeciesName("Pikachu")).toBe("pikachu");
      expect(normalizeSpeciesName("Dracaufeu-ex")).toBe("dracaufeu");
      expect(normalizeSpeciesName("Mewtwo VMAX")).toBe("mewtwo");
      expect(normalizeSpeciesName("Électhor-V")).toBe("electhor");
      expect(normalizeSpeciesName("Rayquaza VSTAR")).toBe("rayquaza");
      expect(normalizeSpeciesName("Lugia GX")).toBe("lugia");
      expect(normalizeSpeciesName("")).toBe("");
      expect(normalizeSpeciesName(undefined)).toBe("");
    });
  });

  describe("getOfficialArtworkUrl", () => {
    it("returns official GitHub repository transparent sprite URL", () => {
      expect(getOfficialArtworkUrl(25)).toBe(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
      );
      expect(getOfficialArtworkUrl(undefined)).toBe("/images/carte-pokemon-dos.jpg");
    });
  });

  describe("evaluateGuess", () => {
    const targetCard: PokemonCardType = {
      id: "target-1",
      name: "Dracaufeu",
      dexId: [6],
      hp: 120,
      retreat: 3,
      types: ["Feu", "Vol"],
    } as PokemonCardType;

    it("evaluates a completely correct guess", () => {
      const guessCard: PokemonCardType = {
        id: "guess-exact",
        name: "Dracaufeu-ex",
        dexId: [6],
        hp: 120,
        retreat: 3,
        types: ["Feu", "Vol"],
      } as PokemonCardType;

      const row = evaluateGuess(targetCard, guessCard);

      expect(row.checks.name).toBe("correct");
      expect(row.checks.generation).toBe("correct");
      expect(row.checks.dexId).toBe("correct");
      expect(row.checks.type1).toBe("correct");
      expect(row.checks.type2).toBe("correct");
      expect(row.checks.hp).toBe("correct");
      expect(row.checks.retreat).toBe("correct");
    });

    it("evaluates directional checks (higher / lower)", () => {
      // Bulbizarre: Gen 1, #001, Plante/Poison, 45 HP, retreat 1
      const guessCard: PokemonCardType = {
        id: "guess-bulba",
        name: "Bulbizarre",
        dexId: [1],
        hp: 50,
        retreat: 1,
        types: ["Plante", "Poison"],
      } as PokemonCardType;

      const row = evaluateGuess(targetCard, guessCard);

      expect(row.checks.name).toBe("incorrect");
      expect(row.checks.dexId).toBe("higher"); // Target (6) is higher than guess (1)
      expect(row.checks.generation).toBe("correct"); // Both gen 1
      expect(row.checks.hp).toBe("higher"); // Target (120) is higher than guess (50)
      expect(row.checks.retreat).toBe("higher"); // Target (3) is higher than guess (1)
      expect(row.checks.type1).toBe("incorrect");
      expect(row.checks.type2).toBe("incorrect");
    });

    it("evaluates inverted directional checks", () => {
      // Lucario: Gen 4 (#448), Combat/Acier, 130 HP, retreat 2
      const guessCard: PokemonCardType = {
        id: "guess-lucario",
        name: "Lucario",
        dexId: [448],
        hp: 140,
        retreat: 4,
        types: ["Combat", "Métal"],
      } as PokemonCardType;

      const row = evaluateGuess(targetCard, guessCard);

      expect(row.checks.dexId).toBe("lower"); // Target (6) is lower than guess (448)
      expect(row.checks.generation).toBe("lower"); // Target (Gen 1) is lower than guess (Gen 4)
      expect(row.checks.hp).toBe("lower"); // Target (120) is lower than guess (140)
      expect(row.checks.retreat).toBe("lower"); // Target (3) is lower than guess (4)
    });

    it("evaluates cross-type partial matches", () => {
      // Guess has "Vol" as Type 1 (target has "Vol" as Type 2)
      const guessCard: PokemonCardType = {
        id: "guess-pidgey",
        name: "Roucool",
        dexId: [16],
        hp: 60,
        retreat: 1,
        types: ["Vol", "Normal"],
      } as PokemonCardType;

      const row = evaluateGuess(targetCard, guessCard);

      expect(row.checks.type1).toBe("partial"); // Vol is in target Type 2
      expect(row.checks.type2).toBe("incorrect");
    });
  });

  describe("generateShareText", () => {
    it("generates formatted Wordle emoji string with emojis and link", () => {
      const targetCard: PokemonCardType = {
        id: "t1",
        name: "Pikachu",
        dexId: [25],
        hp: 60,
        retreat: 1,
        types: ["Électrik"],
      } as PokemonCardType;

      const guess1: PokemonCardType = {
        id: "g1",
        name: "Salamèche",
        dexId: [4],
        hp: 50,
        retreat: 1,
        types: ["Feu"],
      } as PokemonCardType;

      const guess2: PokemonCardType = {
        id: "g2",
        name: "Pikachu",
        dexId: [25],
        hp: 60,
        retreat: 1,
        types: ["Électrik"],
      } as PokemonCardType;

      const r1 = evaluateGuess(targetCard, guess1);
      const r2 = evaluateGuess(targetCard, guess2);

      const share = generateShareText({
        date: "2026-09-10",
        isDaily: true,
        guesses: [r1, r2],
        won: true,
      });

      expect(share).toContain("Pokédle du jour 2026-09-10 (2/6)");
      expect(share).toContain("🟩");
      expect(share).toContain("⬆️");
      expect(share).toContain("https://tcg-nexus.org/pokemon/mini-games/pokedle");
    });
  });

  describe("getPokedleStats and recordGameResult", () => {
    it("persists victories and updates current and max streaks", () => {
      expect(getPokedleStats().played).toBe(0);

      const stats1 = recordGameResult(true, 3, "2026-09-08");
      expect(stats1.played).toBe(1);
      expect(stats1.won).toBe(1);
      expect(stats1.currentStreak).toBe(1);
      expect(stats1.maxStreak).toBe(1);
      expect(stats1.guessesDistribution[3]).toBe(1);

      // Same day or continuous day
      const stats2 = recordGameResult(true, 4, "2026-09-08");
      expect(stats2.played).toBe(2);
      expect(stats2.won).toBe(2);
      expect(stats2.currentStreak).toBe(2);
      expect(stats2.maxStreak).toBe(2);

      // Loss resets current streak
      const stats3 = recordGameResult(false, 6, "2026-09-08");
      expect(stats3.played).toBe(3);
      expect(stats3.won).toBe(2);
      expect(stats3.currentStreak).toBe(0);
      expect(stats3.maxStreak).toBe(2);
    });
  });

  describe("getDailyState and saveDailyState", () => {
    it("saves and retrieves daily game snapshot", () => {
      const date = "2026-09-10";
      expect(getDailyState(date)).toBeNull();

      saveDailyState({
        date,
        guesses: [],
        targetCard: { id: "c1", name: "Pikachu" } as PokemonCardType,
        gameState: "playing",
      });

      const saved = getDailyState(date);
      expect(saved).not.toBeNull();
      expect(saved?.targetCard.name).toBe("Pikachu");
      expect(saved?.gameState).toBe("playing");
    });
  });

  describe("getTimeUntilMidnight", () => {
    it("computes countdown within valid bounds", () => {
      const countdown = getTimeUntilMidnight();
      expect(countdown.hours).toBeGreaterThanOrEqual(0);
      expect(countdown.hours).toBeLessThanOrEqual(24);
      expect(countdown.minutes).toBeGreaterThanOrEqual(0);
      expect(countdown.minutes).toBeLessThan(60);
      expect(countdown.seconds).toBeGreaterThanOrEqual(0);
      expect(countdown.seconds).toBeLessThan(60);
    });
  });
});
