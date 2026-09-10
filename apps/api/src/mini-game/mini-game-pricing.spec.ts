import {
  cardMarketValue,
  guessDirection,
  isGuessWithinTolerance,
  JUSTE_PRIX_MAX_ACCURACY_POINTS,
  JUSTE_PRIX_MAX_SPEED_BONUS,
  priceTolerance,
  scoreJustePrixGuess,
  scoreSoloJustePrixRound,
} from "./mini-game-pricing";

describe("mini-game pricing", () => {
  describe("cardMarketValue", () => {
    it("prefers the cardmarket trend", () => {
      expect(
        cardMarketValue({
          pricing: {
            cardmarket: { trend: "12.345", avg: 10, low: 5 },
            tcgplayer: { normal: { marketPrice: 99 } },
          },
        }),
      ).toBe(12.35);
    });

    it("falls back through cardmarket averages then tcgplayer variants", () => {
      expect(
        cardMarketValue({ pricing: { cardmarket: { trend: null, avg: 4 } } }),
      ).toBe(4);
      expect(
        cardMarketValue({
          pricing: {
            cardmarket: { trend: null, avg: null, low: null },
            tcgplayer: { normal: null, holofoil: { midPrice: "7.5" } },
          },
        }),
      ).toBe(7.5);
    });

    it("returns null instead of a made-up price", () => {
      expect(cardMarketValue(undefined)).toBeNull();
      expect(cardMarketValue({ pricing: null })).toBeNull();
      expect(
        cardMarketValue({ pricing: { cardmarket: { trend: 0 } } }),
      ).toBeNull();
      expect(
        cardMarketValue({ pricing: { cardmarket: { trend: "abc" } } }),
      ).toBeNull();
    });
  });

  describe("tolerance", () => {
    it("is 10 % with a 20 cent floor", () => {
      expect(priceTolerance(100)).toBe(10);
      expect(priceTolerance(0.5)).toBe(0.2);
    });

    it("drives the direction hint", () => {
      expect(guessDirection(100, 95)).toBe("correct");
      expect(guessDirection(100, 50)).toBe("higher");
      expect(guessDirection(100, 150)).toBe("lower");
      expect(isGuessWithinTolerance(0.15, 0.3)).toBe(true);
    });
  });

  describe("scoreJustePrixGuess", () => {
    it("gives full marks plus the full speed bonus for an instant exact guess", () => {
      expect(scoreJustePrixGuess(50, 50, 0, 20)).toBe(
        JUSTE_PRIX_MAX_ACCURACY_POINTS + JUSTE_PRIX_MAX_SPEED_BONUS,
      );
    });

    it("scales the speed bonus with the time left", () => {
      expect(scoreJustePrixGuess(50, 50, 10, 20)).toBe(1000 + 150);
      expect(scoreJustePrixGuess(50, 50, 20, 20)).toBe(1000);
      expect(scoreJustePrixGuess(50, 50, 45, 20)).toBe(1000);
    });

    it("loses accuracy linearly and reaches zero at 50 % deviation", () => {
      expect(scoreJustePrixGuess(100, 80, 5, 20)).toBe(600);
      expect(scoreJustePrixGuess(100, 150, 5, 20)).toBe(0);
      expect(scoreJustePrixGuess(100, 1_000_000, 5, 20)).toBe(0);
    });

    it("gives nothing for a timeout or an unpriced item", () => {
      expect(scoreJustePrixGuess(50, null, 20, 20)).toBe(0);
      expect(scoreJustePrixGuess(0, 0, 1, 20)).toBe(0);
    });
  });

  describe("scoreSoloJustePrixRound", () => {
    it("rewards fewer attempts and never drops below 10", () => {
      expect(scoreSoloJustePrixRound(1)).toBe(100);
      expect(scoreSoloJustePrixRound(2)).toBe(85);
      expect(scoreSoloJustePrixRound(5)).toBe(40);
      expect(scoreSoloJustePrixRound(12)).toBe(10);
    });
  });
});
