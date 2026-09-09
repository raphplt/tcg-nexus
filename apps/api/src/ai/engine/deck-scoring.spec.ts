import { DeckCardRoleTag } from "./card-roles";
import { DeckScoreKey, type ScoringFacts, scoreDeck } from "./deck-scoring";

const perfectFacts = (): ScoringFacts => ({
  totalCards: 60,
  pokemonCount: 14,
  energyCount: 18,
  energyPercentage: 30,
  averageEnergyCost: 2,
  averageRetreatCost: 1,
  roleCounts: {
    [DeckCardRoleTag.Draw]: 8,
    [DeckCardRoleTag.Search]: 6,
    [DeckCardRoleTag.EnergyAcceleration]: 3,
    [DeckCardRoleTag.Recovery]: 2,
    [DeckCardRoleTag.Switch]: 3,
    [DeckCardRoleTag.Disruption]: 2,
    [DeckCardRoleTag.Healing]: 0,
  },
  typeCount: 1,
  evolutionLines: [],
  legality: "valid",
  copyLimitBreaches: 0,
  effectsCoveragePercentage: 100,
});

describe("scoreDeck", () => {
  it("gives a clean list a perfect score with no contributions", () => {
    const board = scoreDeck(perfectFacts());

    expect(board.global).toBe(100);
    expect(
      board.breakdown.every((score) => score.contributions.length === 0),
    ).toBe(true);
  });

  it("excludes the legality dimension and renormalizes when no format was checked", () => {
    const board = scoreDeck({ ...perfectFacts(), legality: "not-checked" });

    const legality = board.breakdown.find(
      (score) => score.key === DeckScoreKey.Legality,
    );
    expect(legality).toMatchObject({ value: null, weight: 0 });

    // The remaining weights still sum to 1 after renormalization, so a
    // flawless unformatted deck is not penalised for having no format.
    expect(board.global).toBe(100);
  });

  it("drops an illegal deck well below a merely inconsistent one", () => {
    const illegal = scoreDeck({ ...perfectFacts(), legality: "invalid" });
    const inconsistent = scoreDeck({
      ...perfectFacts(),
      roleCounts: { ...perfectFacts().roleCounts, [DeckCardRoleTag.Draw]: 0 },
    });

    expect(illegal.global).toBeLessThan(inconsistent.global);
  });

  it("never goes below zero however many rules fire", () => {
    const board = scoreDeck({
      totalCards: 12,
      pokemonCount: 12,
      energyCount: 0,
      energyPercentage: 0,
      averageEnergyCost: 4,
      averageRetreatCost: 4,
      roleCounts: {
        [DeckCardRoleTag.Draw]: 0,
        [DeckCardRoleTag.Search]: 0,
        [DeckCardRoleTag.EnergyAcceleration]: 0,
        [DeckCardRoleTag.Recovery]: 0,
        [DeckCardRoleTag.Switch]: 0,
        [DeckCardRoleTag.Disruption]: 0,
        [DeckCardRoleTag.Healing]: 0,
      },
      typeCount: 6,
      evolutionLines: [
        {
          base: "A",
          evolution: "B",
          baseQty: 0,
          evolutionQty: 4,
          issue: "orphan",
          cardIds: [],
        },
      ],
      legality: "invalid",
      copyLimitBreaches: 4,
      effectsCoveragePercentage: 100,
    });

    expect(board.global).toBeGreaterThanOrEqual(0);
    expect(
      board.breakdown.every(
        (score) => score.value === null || score.value >= 0,
      ),
    ).toBe(true);
  });

  it("reports effect coverage as the confidence of the scoreboard", () => {
    const board = scoreDeck({
      ...perfectFacts(),
      effectsCoveragePercentage: 42,
    });

    expect(board.confidence).toBe(42);
  });

  it("penalises a missing draw engine in proportion to the shortfall", () => {
    const facts = perfectFacts();
    const someDraw = scoreDeck({
      ...facts,
      roleCounts: { ...facts.roleCounts, [DeckCardRoleTag.Draw]: 4 },
    });
    const noDraw = scoreDeck({
      ...facts,
      roleCounts: { ...facts.roleCounts, [DeckCardRoleTag.Draw]: 0 },
    });

    const valueOf = (board: ReturnType<typeof scoreDeck>) =>
      board.breakdown.find((score) => score.key === DeckScoreKey.Consistency)
        ?.value;

    expect(valueOf(someDraw)).toBe(90);
    expect(valueOf(noDraw)).toBe(70);
  });
});
