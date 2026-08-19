import { Card } from "../../card/entities/card.entity";
import {
  computeConfidence,
  nameScore,
  scoreCard,
  toCandidate,
} from "./scan-matcher";

describe("ScanMatcher", () => {
  const sampleCard = {
    id: "c-1",
    name: "Charizard",
    localId: "004",
    rarity: "Rare Holo",
    image: "https://img.tcg-nexus.org/c1.png",
    set: {
      name: "Base Set",
      cardCount: { official: 102, total: 102 },
    },
  } as unknown as Card;

  describe("nameScore", () => {
    it("should return highest name score across candidates", () => {
      const score = nameScore(sampleCard, ["Charizard", "Pikachu"]);
      expect(score).toBeCloseTo(1, 2);
    });

    it("should return 0 if candidates are empty or short", () => {
      expect(nameScore(sampleCard, [])).toBe(0);
      expect(nameScore(sampleCard, ["ab"])).toBe(0);
    });
  });

  describe("scoreCard", () => {
    it("should calculate composite score from name, number and set", () => {
      const fields = {
        cardName: "Charizard",
        setNumber: "4",
        setTotal: "102",
        setName: "Base Set",
      };

      const score = scoreCard(sampleCard, fields, ["Charizard"]);
      expect(score).toBeGreaterThan(0.8);
    });

    it("should handle partial set number match without total", () => {
      const fields = {
        cardName: "Charizard",
        setNumber: "004",
      };

      const score = scoreCard(sampleCard, fields, ["Charizard"]);
      expect(score).toBeGreaterThan(0.6);
    });
  });

  describe("toCandidate", () => {
    it("should map Card entity to ScanCardCandidate", () => {
      const candidate = toCandidate(sampleCard, 0.95);
      expect(candidate).toEqual({
        id: "c-1",
        name: "Charizard",
        image: "https://img.tcg-nexus.org/c1.png",
        localId: "004",
        rarity: "Rare Holo",
        setName: "Base Set",
        score: 0.95,
      });
    });
  });

  describe("computeConfidence", () => {
    it("should return high confidence for dominant single candidate", () => {
      const result = computeConfidence([
        { id: "1", score: 0.95 } as any,
        { id: "2", score: 0.4 } as any,
      ]);
      expect(result.confidenceLevel).toBe("high");
      expect(result.confidence).toBe(0.95);
    });

    it("should demote to medium if scores are near identical", () => {
      const result = computeConfidence([
        { id: "1", score: 0.85 } as any,
        { id: "2", score: 0.84 } as any,
      ]);
      expect(result.confidenceLevel).toBe("medium");
    });

    it("should return low confidence for low scores", () => {
      const result = computeConfidence([{ id: "1", score: 0.3 } as any]);
      expect(result.confidenceLevel).toBe("low");
    });
  });
});
