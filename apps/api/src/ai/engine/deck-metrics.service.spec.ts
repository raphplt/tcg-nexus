import { Test, TestingModule } from "@nestjs/testing";
import { CatalogLocalizationService } from "../../card/catalog-localization.service";
import { PokemonCardsType } from "../../common/enums/pokemonCardsType";
import { DeckLegalityStatus } from "../../tournament/entities/tournament-deck-snapshot.entity";
import { DeckLegalityService } from "../../tournament/services/deck-legality.service";
import { DeckCardRoleTag } from "./card-roles";
import { DiagnosticCode, DiagnosticSeverity } from "./deck-diagnostics";
import {
  type AnalyzableDeckCard,
  DeckMetricsService,
} from "./deck-metrics.service";
import { DeckScoreKey } from "./deck-scoring";

type CardOverrides = {
  id: string;
  name?: string;
  category?: string;
  types?: string[];
  attacks?: { cost: string[] }[];
  retreat?: number;
  energyType?: string;
  evolveFrom?: string;
  parsedEffects?: Record<string, unknown> | null;
};

const card = (overrides: CardOverrides): AnalyzableDeckCard["card"] =>
  ({
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    pokemonDetails: {
      category: overrides.category ?? PokemonCardsType.Pokemon,
      types: overrides.types,
      attacks: overrides.attacks,
      retreat: overrides.retreat,
      energyType: overrides.energyType,
      evolveFrom: overrides.evolveFrom,
      parsedEffects: overrides.parsedEffects ?? null,
    },
  }) as unknown as AnalyzableDeckCard["card"];

/** A trainer whose parsed effects make it count as draw. */
const drawTrainer = (id: string) =>
  card({
    id,
    category: PokemonCardsType.Trainer,
    parsedEffects: {
      kind: "trainer",
      playEffects: [{ type: "DRAW_CARD", amount: 3 }],
    },
  });

/** A trainer whose parsed effects make it count as search. */
const searchTrainer = (id: string) =>
  card({
    id,
    category: PokemonCardsType.Trainer,
    parsedEffects: {
      kind: "trainer",
      playEffects: [{ type: "SEARCH_DECK", amount: 1, destination: "HAND" }],
    },
  });

const basicEnergy = (id: string) =>
  card({
    id,
    name: id,
    category: PokemonCardsType.Energy,
    energyType: "Fire",
  });

const codesOf = (result: { diagnostics: { code: DiagnosticCode }[] }) =>
  result.diagnostics.map((entry) => entry.code);

describe("DeckMetricsService", () => {
  let service: DeckMetricsService;
  const legality = { validate: jest.fn() };
  const resolveLabels = jest.fn(async (payload: unknown) => payload);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckMetricsService,
        {
          provide: CatalogLocalizationService,
          useValue: { resolveLabels },
        },
        { provide: DeckLegalityService, useValue: legality },
      ],
    }).compile();

    service = module.get(DeckMetricsService);
  });

  afterEach(() => jest.resetAllMocks());

  describe("composition", () => {
    it("counts copies rather than distinct cards and normalizes localized categories", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1", types: ["Fire"] }), qty: 4 },
        { card: card({ id: "e1", category: "Énergie" }), qty: 8 },
        { card: card({ id: "t1", category: "Dresseur" }), qty: 3 },
      ]);

      expect(result.totalCards).toBe(15);
      expect(result.pokemonCount).toBe(4);
      expect(result.energyCount).toBe(8);
      expect(result.trainerCount).toBe(3);
      expect(
        result.typeDistribution.find((entry) => entry.label === "Fire")?.count,
      ).toBe(4);
    });

    it("averages attack cost over copies and reports the retreat cost", async () => {
      const result = await service.analyze([
        {
          card: card({
            id: "p1",
            attacks: [{ cost: ["Fire", "Colorless"] }],
            retreat: 3,
          }),
          qty: 2,
        },
        {
          card: card({ id: "p2", attacks: [{ cost: ["Water"] }], retreat: 1 }),
          qty: 2,
        },
      ]);

      expect(result.averageEnergyCost).toBe(1.5);
      expect(result.averageRetreatCost).toBe(2);
      expect(
        result.attackCostDistribution.find((entry) => entry.cost === 2)?.count,
      ).toBe(2);
    });

    it("flags cards over four copies but exempts basic energy", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1", name: "Pikachu" }), qty: 5 },
        { card: basicEnergy("e1"), qty: 12 },
      ]);

      expect(result.duplicates).toEqual([
        { cardId: "p1", cardName: "Pikachu", qty: 5 },
      ]);
      expect(codesOf(result)).toContain(DiagnosticCode.CopyLimitExceeded);
    });
  });

  describe("evolution lines", () => {
    it("flags an evolution whose pre-evolution is absent", async () => {
      const result = await service.analyze([
        {
          card: card({ id: "p2", name: "Reptincel", evolveFrom: "Salamèche" }),
          qty: 2,
        },
      ]);

      expect(result.evolutionLines[0]).toMatchObject({
        evolution: "Reptincel",
        baseQty: 0,
        issue: "orphan",
      });
      expect(codesOf(result)).toContain(DiagnosticCode.EvolutionOrphan);
    });

    it("flags a line running more evolutions than pre-evolutions", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1", name: "Salamèche" }), qty: 1 },
        {
          card: card({ id: "p2", name: "Reptincel", evolveFrom: "Salameche" }),
          qty: 3,
        },
      ]);

      expect(result.evolutionLines[0]).toMatchObject({
        baseQty: 1,
        evolutionQty: 3,
        issue: "under-supported",
      });
      expect(codesOf(result)).toContain(DiagnosticCode.EvolutionUnderSupported);
    });

    it("accepts a line with enough pre-evolutions", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1", name: "Salamèche" }), qty: 4 },
        {
          card: card({ id: "p2", name: "Reptincel", evolveFrom: "Salamèche" }),
          qty: 3,
        },
      ]);

      expect(result.evolutionLines[0].issue).toBeNull();
      expect(codesOf(result)).not.toContain(DiagnosticCode.EvolutionOrphan);
    });
  });

  describe("engine roles", () => {
    it("counts draw and search copies from parsed effects", async () => {
      const result = await service.analyze([
        { card: drawTrainer("t1"), qty: 4 },
        { card: searchTrainer("t2"), qty: 4 },
        { card: basicEnergy("e1"), qty: 10 },
      ]);

      const roles = Object.fromEntries(
        result.roles.map((entry) => [entry.role, entry.count]),
      );
      expect(roles[DeckCardRoleTag.Draw]).toBe(4);
      expect(roles[DeckCardRoleTag.Search]).toBe(4);
      expect(codesOf(result)).toContain(DiagnosticCode.DrawEngineWeak);
      expect(codesOf(result)).not.toContain(DiagnosticCode.SearchEngineWeak);
    });

    it("stays silent on consistency when too few effects could be read", async () => {
      // Trainers without parsed effects: the engine cannot see a draw engine,
      // so it reports the coverage gap instead of claiming the deck has none.
      const result = await service.analyze([
        {
          card: card({ id: "t1", category: PokemonCardsType.Trainer }),
          qty: 10,
        },
        { card: basicEnergy("e1"), qty: 10 },
      ]);

      expect(codesOf(result)).toContain(DiagnosticCode.EffectsCoverageLow);
      expect(codesOf(result)).not.toContain(DiagnosticCode.DrawEngineWeak);
      expect(result.effectsCoverage).toEqual({
        withEffects: 0,
        expected: 10,
        percentage: 0,
      });
      expect(result.scores.confidence).toBe(0);
    });
  });

  describe("legality", () => {
    it("reports not-checked and drops the dimension when the deck has no format", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1" }), qty: 1 },
      ]);

      expect(legality.validate).not.toHaveBeenCalled();
      expect(result.legality.status).toBe("not-checked");

      const dimension = result.scores.breakdown.find(
        (entry) => entry.key === DeckScoreKey.Legality,
      );
      expect(dimension).toMatchObject({ value: null, weight: 0 });
    });

    it("checks a Standard deck against the 2026 rule set", async () => {
      legality.validate.mockResolvedValue({
        status: DeckLegalityStatus.INVALID,
        errors: ["La carte X n'est pas autorisée en standard."],
        unknowns: [],
        totalCards: 60,
      });

      const result = await service.analyze(
        [{ card: card({ id: "p1" }), qty: 1 }],
        { formatId: 3, formatType: "Standard" },
      );

      expect(legality.validate).toHaveBeenCalledWith(
        [{ cardId: "p1", name: "p1", quantity: 1 }],
        "POKEMON_STANDARD_2026",
        3,
      );
      expect(result.legality.status).toBe("invalid");
      expect(codesOf(result)).toContain(DiagnosticCode.LegalityInvalid);
    });

    it("never presents an unverifiable list as legal", async () => {
      legality.validate.mockResolvedValue({
        status: DeckLegalityStatus.UNVERIFIED,
        errors: [],
        unknowns: ["La légalité standard de la carte p1 est inconnue."],
        totalCards: 60,
      });

      const result = await service.analyze(
        [{ card: card({ id: "p1" }), qty: 1 }],
        { formatType: "Standard" },
      );

      expect(result.legality.status).toBe("unverified");
      const dimension = result.scores.breakdown.find(
        (entry) => entry.key === DeckScoreKey.Legality,
      );
      expect(dimension?.value).toBeLessThan(100);
    });

    it("leaves an unknown format unchecked instead of guessing a rule set", async () => {
      const result = await service.analyze(
        [{ card: card({ id: "p1" }), qty: 1 }],
        { formatType: "Théâtre" },
      );

      expect(legality.validate).not.toHaveBeenCalled();
      expect(result.legality.status).toBe("not-checked");
    });
  });

  describe("output contract", () => {
    it("splits diagnostics into warnings and suggestions by severity", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1", types: ["Fire"] }), qty: 4 },
        { card: drawTrainer("t1"), qty: 8 },
      ]);

      const errorsAndWarnings = result.diagnostics.filter(
        (entry) => entry.severity !== DiagnosticSeverity.Info,
      );
      expect(result.warnings).toHaveLength(errorsAndWarnings.length);
      expect(result.warnings.every((message) => message.length > 0)).toBe(true);
      expect(result.diagnostics.every((entry) => !!entry.message)).toBe(true);
    });

    it("renders diagnostics in the requested locale", async () => {
      const fr = await service.analyze([{ card: card({ id: "p1" }), qty: 4 }], {
        locale: "fr",
      });
      const en = await service.analyze([{ card: card({ id: "p1" }), qty: 4 }], {
        locale: "en",
      });

      expect(fr.warnings[0]).toContain("Deck incomplet");
      expect(en.warnings[0]).toContain("Incomplete deck");
      expect(fr.diagnostics[0].code).toBe(en.diagnostics[0].code);
    });

    it("resolves localized labels before comparing names", async () => {
      const cards = [{ card: card({ id: "p1" }), qty: 1 }];
      await service.analyze(cards);

      expect(resolveLabels).toHaveBeenCalledWith(cards);
    });

    it("keeps every score traceable to the rules that moved it", async () => {
      const result = await service.analyze([
        { card: card({ id: "p1" }), qty: 4 },
      ]);

      const consistency = result.scores.breakdown.find(
        (entry) => entry.key === DeckScoreKey.Consistency,
      );
      const applied = (consistency?.contributions ?? []).reduce(
        (sum, entry) => sum + entry.delta,
        0,
      );
      expect(consistency?.value).toBe(Math.max(0, 100 + applied));
      expect(consistency?.contributions.length).toBeGreaterThan(0);
    });
  });

  describe("missing cards", () => {
    it("asks for exactly the copies the thresholds are short of", async () => {
      const result = await service.analyze([
        { card: drawTrainer("t1"), qty: 2 },
        { card: searchTrainer("t2"), qty: 1 },
      ]);

      expect(result.missingCards).toContainEqual(
        expect.objectContaining({
          label: "Cartes de pioche",
          recommendedQty: 4,
        }),
      );
      expect(result.missingCards).toContainEqual(
        expect.objectContaining({
          label: "Cartes de recherche",
          recommendedQty: 3,
        }),
      );
    });
  });
});
