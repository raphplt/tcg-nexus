import { describe, expect, it } from "vitest";
import {
  cardMarketValue,
  formatEuro,
  guessDirection,
  parseEuroInput,
  priceTolerance,
  scoreJustePrixGuess,
  scoreSoloJustePrixRound,
} from "@/utils/miniGames/pricing";

/**
 * These expectations are the same as in
 * `apps/api/src/mini-game/mini-game-pricing.spec.ts`: both sides must score
 * a guess identically.
 */
describe("mini-game pricing (mirror of the API rules)", () => {
  it("reads the card market value in the API order", () => {
    expect(
      cardMarketValue({
        pricing: {
          cardmarket: { trend: 12.345, avg: 10, low: 5 } as never,
          tcgplayer: { normal: { marketPrice: 99 } } as never,
        },
      }),
    ).toBe(12.35);
    expect(
      cardMarketValue({
        pricing: {
          cardmarket: null,
          tcgplayer: { holofoil: { midPrice: 7.5 } } as never,
        },
      }),
    ).toBe(7.5);
    expect(cardMarketValue({ pricing: null })).toBeNull();
    expect(
      cardMarketValue({ pricing: { cardmarket: { trend: 0 } as never } }),
    ).toBeNull();
  });

  it("uses a 10 % tolerance with a 20 cent floor", () => {
    expect(priceTolerance(100)).toBe(10);
    expect(priceTolerance(0.5)).toBe(0.2);
    expect(guessDirection(100, 95)).toBe("correct");
    expect(guessDirection(100, 50)).toBe("higher");
    expect(guessDirection(100, 150)).toBe("lower");
  });

  it("scores an online guess like the server", () => {
    expect(scoreJustePrixGuess(50, 50, 0, 20)).toBe(1300);
    expect(scoreJustePrixGuess(50, 50, 10, 20)).toBe(1150);
    expect(scoreJustePrixGuess(100, 80, 5, 20)).toBe(600);
    expect(scoreJustePrixGuess(100, 150, 5, 20)).toBe(0);
    expect(scoreJustePrixGuess(50, null, 20, 20)).toBe(0);
  });

  it("scores a solo round by attempts", () => {
    expect(scoreSoloJustePrixRound(1)).toBe(100);
    expect(scoreSoloJustePrixRound(2)).toBe(85);
    expect(scoreSoloJustePrixRound(12)).toBe(10);
  });

  it("parses what a French or English user types", () => {
    expect(parseEuroInput("12,50")).toBe(12.5);
    expect(parseEuroInput("12.50 €")).toBe(12.5);
    expect(parseEuroInput(" 3 ")).toBe(3);
    expect(parseEuroInput("0")).toBeNull();
    expect(parseEuroInput("-4")).toBeNull();
    expect(parseEuroInput("abc")).toBeNull();
    expect(parseEuroInput("1,2,3")).toBeNull();
    expect(parseEuroInput("")).toBeNull();
  });

  it("formats euros per locale", () => {
    expect(formatEuro(12.5, "en")).toBe("€12.50");
    expect(formatEuro(12.5, "fr").replace(/ | /g, " ")).toBe("12,50 €");
  });
});
