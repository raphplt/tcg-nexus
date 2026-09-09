import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { DeckFormat } from "src/deck-format/entities/deck-format.entity";
import { DeckLegalityStatus } from "../entities/tournament-deck-snapshot.entity";
import { DeckLegalityService } from "./deck-legality.service";

describe("DeckLegalityService", () => {
  /** Catalog identifiers are UUIDs; the helpers below build stable ones. */
  const uuid = (seed: number) =>
    `00000000-0000-4000-8000-${String(seed).padStart(12, "0")}`;

  let service: DeckLegalityService;
  let cardRepository: { find: jest.Mock };
  let formatRepository: { findOne: jest.Mock };

  /** Builds a catalog card with the rule data the checks read. */
  const card = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    legal: { standard: true, expanded: true },
    pokemonDetails: { category: PokemonCardsType.Pokemon },
    ...overrides,
  });

  /** Builds a basic energy card, which the copy limit exempts. */
  const basicEnergy = (id: string) =>
    card(id, {
      pokemonDetails: {
        category: PokemonCardsType.Energy,
        energyType: "Basic",
      },
    });

  /** Builds a list of `copies` of one card, padded to 60 with a second card. */
  const list = (entries: Array<[string, number]>) =>
    entries.map(([cardId, quantity]) => ({
      cardId,
      name: cardId,
      quantity,
    }));

  beforeEach(async () => {
    cardRepository = { find: jest.fn().mockResolvedValue([]) };
    formatRepository = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckLegalityService,
        { provide: getRepositoryToken(Card), useValue: cardRepository },
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: formatRepository,
        },
      ],
    }).compile();

    service = module.get(DeckLegalityService);
  });

  it("accepts a list whose every rule could be checked", async () => {
    cardRepository.find.mockResolvedValue([
      card(uuid(1)),
      card(uuid(3), {
        pokemonDetails: {
          category: PokemonCardsType.Energy,
          energyType: "Basic",
        },
      }),
    ]);

    const result = await service.validate(
      list([
        [uuid(1), 4],
        [uuid(3), 56],
      ]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.VALID);
    expect(result.errors).toEqual([]);
  });

  it("refuses a card the catalog does not know", async () => {
    // The audited defect: a fabricated card in 60 copies passed validation.
    cardRepository.find.mockResolvedValue([]);

    const result = await service.validate(
      list([[uuid(4), 60]]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.INVALID);
    expect(result.errors[0]).toContain("introuvable dans le catalogue");
  });

  it("refuses more than four copies of a card that is not basic energy", async () => {
    cardRepository.find.mockResolvedValue([card(uuid(1)), card(uuid(2))]);

    const result = await service.validate(
      list([
        [uuid(1), 5],
        [uuid(2), 55],
      ]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.INVALID);
    expect(result.errors.some((error) => error.includes("5 exemplaires"))).toBe(
      true,
    );
  });

  it("allows basic energy beyond the copy limit", async () => {
    cardRepository.find.mockResolvedValue([
      card(uuid(3), {
        pokemonDetails: {
          category: PokemonCardsType.Energy,
          energyType: "Basic",
        },
      }),
    ]);

    const result = await service.validate(
      list([[uuid(3), 60]]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.VALID);
  });

  it("refuses a card the rule set does not allow", async () => {
    cardRepository.find.mockResolvedValue([
      card(uuid(1), { legal: { standard: false, expanded: true } }),
      basicEnergy(uuid(2)),
    ]);

    const result = await service.validate(
      list([
        [uuid(1), 4],
        [uuid(2), 56],
      ]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.INVALID);
    expect(
      result.errors.some((error) => error.includes("n'est pas autorisée")),
    ).toBe(true);
  });

  it("reports a list as unverified when the rule set is unknown", async () => {
    cardRepository.find.mockResolvedValue([
      card(uuid(1)),
      basicEnergy(uuid(2)),
    ]);

    const result = await service.validate(
      list([
        [uuid(1), 4],
        [uuid(2), 56],
      ]),
      "HOUSE_RULES_2030",
    );

    // Missing rule data is never presented as a verified legality.
    expect(result.status).toBe(DeckLegalityStatus.UNVERIFIED);
    expect(result.unknowns[0]).toContain("inconnu");
  });

  it("reports a list as unverified when a card carries no legality data", async () => {
    cardRepository.find.mockResolvedValue([
      card(uuid(1), { legal: null }),
      basicEnergy(uuid(2)),
    ]);

    const result = await service.validate(
      list([
        [uuid(1), 4],
        [uuid(2), 56],
      ]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.UNVERIFIED);
  });

  it("refuses a deck that does not hold sixty cards", async () => {
    cardRepository.find.mockResolvedValue([card(uuid(1))]);

    const result = await service.validate(
      list([[uuid(1), 4]]),
      "POKEMON_STANDARD_2026",
    );

    expect(result.status).toBe(DeckLegalityStatus.INVALID);
    expect(result.totalCards).toBe(4);
  });

  it("refuses a format that is not active on the submission date", async () => {
    cardRepository.find.mockResolvedValue([
      card(uuid(1)),
      basicEnergy(uuid(2)),
    ]);
    formatRepository.findOne.mockResolvedValue({
      id: 3,
      type: "Standard 2019",
      startDate: "2019-01-01",
      endDate: "2019-12-31",
    });

    const result = await service.validate(
      list([
        [uuid(1), 4],
        [uuid(2), 56],
      ]),
      "POKEMON_STANDARD_2026",
      3,
    );

    expect(result.status).toBe(DeckLegalityStatus.INVALID);
    expect(
      result.errors.some((error) => error.includes("n'est pas actif")),
    ).toBe(true);
  });
});
