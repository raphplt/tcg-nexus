import { calculateStabilizedTrendScore } from "./trend-score";

describe("calculateStabilizedTrendScore", () => {
  it("ignores activity samples that are too small", () => {
    expect(calculateStabilizedTrendScore(1, 0, 7, 23)).toBe(0);
  });

  it("caps extreme positive growth", () => {
    expect(calculateStabilizedTrendScore(100, 0, 7, 23)).toBe(300);
  });

  it("returns a smoothed growth rate for meaningful activity", () => {
    expect(calculateStabilizedTrendScore(20, 23, 7, 23)).toBeCloseTo(
      92.8571,
      4,
    );
  });
});
