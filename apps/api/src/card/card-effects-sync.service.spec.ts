import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as fs from "fs";
import { DataSource } from "typeorm";
import { CardEffectsSyncService } from "./card-effects-sync.service";
import { Card } from "./entities/card.entity";
import { PokemonCardDetails } from "./entities/pokemon-card-details.entity";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe("CardEffectsSyncService", () => {
  let service: CardEffectsSyncService;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockCardRepo = {
    find: jest.fn(),
  };

  const mockDetailsRepo = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardEffectsSyncService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepo,
        },
        {
          provide: getRepositoryToken(PokemonCardDetails),
          useValue: mockDetailsRepo,
        },
      ],
    }).compile();

    service = module.get<CardEffectsSyncService>(CardEffectsSyncService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("syncEffectsFromRegistry", () => {
    it("should throw error if registry file does not exist", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(
        service.syncEffectsFromRegistry("/non/existent.json"),
      ).rejects.toThrow("Registry not found");
    });

    it("should parse registry and update pokemon card details in batches", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          "base1-1": { attack: "Thunderbolt" },
          "base1-2": { attack: "Flamethrower" },
        }),
      );

      mockDataSource.query.mockResolvedValue([]);
      mockCardRepo.find.mockResolvedValue([
        { id: "c-1", tcgDexId: "base1-1" },
        // base1-2 missing from DB
      ]);

      const result = await service.syncEffectsFromRegistry("/mock/path.json");

      expect(result.total).toBe(2);
      expect(result.updated).toBe(1);
      expect(result.notFound).toEqual(["base1-2"]);
      expect(mockDataSource.query).toHaveBeenCalledTimes(2); // column migration + batch update
    });
  });
});
