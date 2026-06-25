import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException } from "@nestjs/common";
import { CardSyncService } from "./card-sync.service";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";

// Mocking TCGdex SDK
jest.mock("@tcgdex/sdk", () => {
  return jest.fn().mockImplementation(() => {
    return {
      fetch: jest.fn().mockImplementation((target: string, id?: string) => {
        if (target === "series") {
          if (id) {
            return { id, name: `Serie Detail ${id}`, logo: "logo-url" };
          }
          return [
            { id: "sv", name: "Écarlate et Violet" },
            { id: "sv-pocket", name: "Pocket Series" }, // should be filtered out
          ];
        }
        if (target === "sets") {
          if (id) {
            return {
              id,
              name: `Set Detail ${id}`,
              logo: "set-logo",
              symbol: "set-symbol",
              releaseDate: "2026-01-01",
              legal: { standard: true, expanded: true },
              cardCount: { total: 2, official: 2, reverse: 0, holo: 0, firstEd: 0 },
              serie: { id: "sv", name: "Écarlate et Violet" },
              cards: [
                { id: `${id}-1`, localId: "1", name: "Pikachu" },
                { id: `${id}-2`, localId: "2", name: "Raichu" },
              ],
            };
          }
          return [
            { id: "sv01", name: "Set 1", serie: "sv" },
            { id: "sv-pocket-1", name: "Pocket Set", serie: "sv-pocket" }, // should be filtered
          ];
        }
        if (target === "cards") {
          return {
            id,
            localId: id?.split("-")[1] || "1",
            name: "Card Name",
            image: "card-image",
            category: "pokemon",
            illustrator: "illustrator",
            rarity: "rare",
            variants: { normal: true },
            variants_detailed: [{ type: "normal" }],
            legal: { standard: true, expanded: true },
            updated: "2026-01-01",
            pricing: {},
            hp: 60,
            types: ["Grass"],
            evolveFrom: "None",
            description: "Some description",
            effect: "None",
            attacks: [],
          };
        }
        return null;
      }),
    };
  });
});

describe("CardSyncService", () => {
  let service: CardSyncService;
  let serieRepoMock: any;
  let setRepoMock: any;
  let cardRepoMock: any;
  let detailsRepoMock: any;
  let savedSeries: any[];

  beforeEach(async () => {
    savedSeries = [];
    serieRepoMock = {
      findOne: jest.fn().mockImplementation(({ where }: any) => {
        return Promise.resolve(savedSeries.find((s) => s.id === where.id) || null);
      }),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => {
        savedSeries.push(dto);
        return Promise.resolve(dto);
      }),
    };
    setRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    };
    cardRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
      count: jest.fn().mockResolvedValue(0),
    };
    detailsRepoMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardSyncService,
        { provide: getRepositoryToken(PokemonSerie), useValue: serieRepoMock },
        { provide: getRepositoryToken(PokemonSet), useValue: setRepoMock },
        { provide: getRepositoryToken(Card), useValue: cardRepoMock },
        { provide: getRepositoryToken(PokemonCardDetails), useValue: detailsRepoMock },
      ],
    }).compile();

    service = module.get<CardSyncService>(CardSyncService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should run sync successfully for new series and sets", async () => {
    setRepoMock.findOne.mockResolvedValue(null); // new set
    cardRepoMock.findOne.mockResolvedValue(null); // new cards

    const stats = await service.syncAll();

    expect(stats.seriesInserted).toBe(1);
    expect(stats.setsInserted).toBe(1);
    expect(stats.cardsSynced).toBe(2);

    expect(serieRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sv", name: "Serie Detail sv" }),
    );
    expect(setRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sv01", name: "Set Detail sv01" }),
    );
    expect(cardRepoMock.create).toHaveBeenCalledTimes(2);
  });

  it("should prevent duplicate runs with ConflictException", async () => {
    setRepoMock.findOne.mockResolvedValue({});
    cardRepoMock.count.mockResolvedValue(2); // set is complete

    // Manually trigger isSyncing to test lock.
    (service as any).isSyncing = true;
    await expect(service.syncAll()).rejects.toThrow(ConflictException);
  });

  it("should skip existing sets that are already complete in DB", async () => {
    savedSeries.push({ id: "sv", name: "Serie" }); // serie exists
    setRepoMock.findOne.mockResolvedValue({ id: "sv01", cardCount: { total: 2 } }); // set exists
    cardRepoMock.count.mockResolvedValue(2); // cards exist in database

    const stats = await service.syncAll();

    expect(stats.seriesInserted).toBe(0);
    expect(stats.setsInserted).toBe(0);
    expect(stats.cardsSynced).toBe(0);
  });
});
