import {
  calculateCardRecencyWeight,
  calculateRecentEventShare,
  sampleRecentCards,
} from "./trending-seed.utils";

describe("trending seed utilities", () => {
  const newestReleaseTimestamp = Date.parse("2026-01-01");
  const recentCard = { id: "recent", set: { releaseDate: "2026-01-01" } };
  const oldCard = { id: "old", set: { releaseDate: "2011-01-01" } };

  it("assigns a substantially higher sampling weight to recent sets", () => {
    const recentWeight = calculateCardRecencyWeight(
      recentCard,
      newestReleaseTimestamp,
    );
    const oldWeight = calculateCardRecencyWeight(
      oldCard,
      newestReleaseTimestamp,
    );

    expect(recentWeight).toBeGreaterThan(oldWeight * 10);
  });

  it("samples without duplicates and favors the recent card", () => {
    const sample = sampleRecentCards([oldCard, recentCard], 1, () => 0.5);

    expect(sample).toEqual([recentCard]);
  });

  it("allocates more current-week activity to recent sets", () => {
    const recentShare = calculateRecentEventShare(
      recentCard,
      newestReleaseTimestamp,
      () => 0.5,
    );
    const oldShare = calculateRecentEventShare(
      oldCard,
      newestReleaseTimestamp,
      () => 0.5,
    );

    expect(recentShare).toBeGreaterThan(oldShare * 2);
  });
});
