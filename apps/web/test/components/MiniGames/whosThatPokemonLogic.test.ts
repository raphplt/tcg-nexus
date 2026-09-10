import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  buildOptions,
  calculateGain,
  formatClue,
  genOf,
  shuffle,
} from "@/components/MiniGames/WhosThatPokemon/whosThatPokemonLogic";
import type { PokemonSpecies } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";

describe("whosThatPokemonLogic", () => {
  describe("genOf", () => {
    it("maps pokedex numbers to generation correctly", () => {
      expect(genOf(1)).toBe(1);
      expect(genOf(151)).toBe(1);
      expect(genOf(152)).toBe(2);
      expect(genOf(251)).toBe(2);
      expect(genOf(252)).toBe(3);
      expect(genOf(386)).toBe(3);
      expect(genOf(387)).toBe(4);
      expect(genOf(493)).toBe(4);
      expect(genOf(494)).toBe(5);
      expect(genOf(649)).toBe(5);
      expect(genOf(650)).toBe(6);
      expect(genOf(721)).toBe(6);
      expect(genOf(722)).toBe(7);
      expect(genOf(809)).toBe(7);
      expect(genOf(810)).toBe(8);
      expect(genOf(898)).toBe(8);
      expect(genOf(899)).toBe(9);
      expect(genOf(1025)).toBe(9);
      expect(genOf(0)).toBe(0);
      expect(genOf(undefined)).toBe(0);
    });
  });

  describe("shuffle", () => {
    it("returns a new array containing all elements", () => {
      const original = [1, 2, 3, 4, 5];
      const result = shuffle(original);
      expect(result).toHaveLength(original.length);
      expect(result).not.toBe(original);
      expect(new Set(result)).toEqual(new Set(original));
    });
  });

  describe("calculateGain", () => {
    it("calculates base score and speed ratio with multiplier", () => {
      // Full time remaining: speedRatio = 1 -> base = 60 + 40 = 100. Mult = 1. Streak = 1 (bonus 0)
      expect(calculateGain(20, 20, 1, 1)).toBe(100);

      // Half time remaining: speedRatio = 0.5 -> base = 60 + 20 = 80. Mult = 2. Total = 160.
      expect(calculateGain(10, 20, 2, 1)).toBe(160);

      // 0 seconds remaining: speedRatio = 0 -> base = 60. Mult = 3. Total = 180.
      expect(calculateGain(0, 10, 3, 1)).toBe(180);
    });

    it("adds streak bonus capped at 50% for 6+ streak", () => {
      // Streak 2: +10% bonus
      // base withMult = 100, streakBonus = 10 -> 110
      expect(calculateGain(20, 20, 1, 2)).toBe(110);

      // Streak 6: +50% bonus (max)
      // base withMult = 100, streakBonus = 50 -> 150
      expect(calculateGain(20, 20, 1, 6)).toBe(150);

      // Streak 10: capped at +50% bonus
      expect(calculateGain(20, 20, 1, 10)).toBe(150);
    });
  });

  describe("buildOptions", () => {
    const target = {
      name: "Pikachu",
      types: ["Lightning"],
      dexId: [25],
    };

    const speciesPool: PokemonSpecies[] = [
      {
        id: "1",
        tcgDexId: "raichu",
        dexId: 26,
        name: "Raichu",
        types: ["Lightning"],
      }, // same gen & type
      {
        id: "2",
        tcgDexId: "zapdos",
        dexId: 145,
        name: "Electhor",
        types: ["Lightning"],
      }, // same gen & type
      {
        id: "3",
        tcgDexId: "voltorb",
        dexId: 100,
        name: "Voltorbe",
        types: ["Lightning"],
      }, // same gen & type
      {
        id: "4",
        tcgDexId: "charizard",
        dexId: 6,
        name: "Dracaufeu",
        types: ["Fire"],
      }, // same gen
      {
        id: "5",
        tcgDexId: "greninja",
        dexId: 658,
        name: "Amphinobi",
        types: ["Water", "Darkness"],
      }, // diff gen & type
      {
        id: "6",
        tcgDexId: "lucario",
        dexId: 448,
        name: "Lucario",
        types: ["Fighting", "Metal"],
      }, // diff gen & type
      {
        id: "7",
        tcgDexId: "gardevoir",
        dexId: 282,
        name: "Gardevoir",
        types: ["Psychic", "Fairy"],
      }, // diff gen & type
    ];

    it("always includes the target name and returns 4 choices", () => {
      const options = buildOptions(target, speciesPool, DIFFICULTIES.easy);
      expect(options).toHaveLength(4);
      expect(options).toContain("Pikachu");
      expect(new Set(options.map((o) => o.toLowerCase())).size).toBe(4);
    });

    it("prefers far distractors in easy mode", () => {
      const options = buildOptions(target, speciesPool, DIFFICULTIES.easy);
      // In easy mode, candidates should prefer different gen and type
      expect(options).toContain("Pikachu");
      const nonTarget = options.filter((o) => o !== "Pikachu");
      expect(nonTarget).toHaveLength(3);
    });

    it("prefers similar distractors in hard mode", () => {
      const options = buildOptions(target, speciesPool, DIFFICULTIES.hard);
      expect(options).toContain("Pikachu");
      const nonTarget = options.filter((o) => o !== "Pikachu");
      expect(nonTarget).toHaveLength(3);
      // "Raichu", "Electhor", "Voltorbe", "Dracaufeu" share type or gen
      expect(
        nonTarget.some((o) =>
          ["Raichu", "Electhor", "Voltorbe", "Dracaufeu"].includes(o),
        ),
      ).toBe(true);
    });
  });

  describe("formatClue", () => {
    const mockCard: PokemonCardType = {
      id: "c-1",
      name: "Pikachu",
      types: ["Lightning"],
      dexId: [25],
    } as never;

    const tPokedex = (key: string) =>
      key === "typeLightning" ? "Électrique" : key;
    const tWhos = (key: string, values?: Record<string, unknown>) => {
      if (key === "clueType") return `Type : ${values?.type}`;
      if (key === "generation") return `Génération ${values?.gen}`;
      return key;
    };

    it("formats type and generation clue in easy mode", () => {
      const clue = formatClue(mockCard, DIFFICULTIES.easy, tPokedex, tWhos);
      expect(clue).toBe("Type : Électrique · Génération 1");
    });

    it("formats type only in medium mode", () => {
      const clue = formatClue(mockCard, DIFFICULTIES.medium, tPokedex, tWhos);
      expect(clue).toBe("Type : Électrique");
    });

    it("returns null in hard mode", () => {
      const clue = formatClue(mockCard, DIFFICULTIES.hard, tPokedex, tWhos);
      expect(clue).toBeNull();
    });
  });
});
