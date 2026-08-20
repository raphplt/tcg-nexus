import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardController } from "./pokemon-card.controller";
import { PokemonCardService } from "./pokemon-card.service";
import { CardSyncService } from "./card-sync.service";

describe("PokemonCardController", () => {
  let controller: PokemonCardController;

  const mockPokemonCardService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findBySearch: jest.fn(),
    findAllPaginated: jest.fn(),
    findRandom: jest.fn(),
    findByScanMatch: jest.fn(),
  };

  const mockCardSyncService = {
    syncAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonCardController],
      providers: [
        {
          provide: PokemonCardService,
          useValue: mockPokemonCardService,
        },
        {
          provide: CardSyncService,
          useValue: mockCardSyncService,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<PokemonCardController>(PokemonCardController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should trigger manual card sync", async () => {
    mockCardSyncService.syncAll.mockResolvedValue({ status: "ok" });
    const result = await controller.sync();
    expect(result).toEqual({ status: "ok" });
    expect(mockCardSyncService.syncAll).toHaveBeenCalled();
  });

  it("should create a card", async () => {
    const dto = { category: "Pokemon" } as any;
    mockPokemonCardService.create.mockResolvedValue({ id: "c-1" });
    const result = await controller.create(dto);
    expect(result).toEqual({ id: "c-1" });
    expect(mockPokemonCardService.create).toHaveBeenCalledWith(dto);
  });

  it("should return all cards", async () => {
    mockPokemonCardService.findAll.mockResolvedValue([{ id: "c-1" }]);
    const result = await controller.findAll();
    expect(result).toEqual([{ id: "c-1" }]);
  });

  it("should return paginated cards", async () => {
    const query = { page: 1, limit: 10, search: "Pikachu" } as any;
    mockPokemonCardService.findAllPaginated.mockResolvedValue({
      data: [],
      total: 0,
    });
    const result = await controller.findAllPaginated(query);
    expect(result).toEqual({ data: [], total: 0 });
    expect(mockPokemonCardService.findAllPaginated).toHaveBeenCalledWith(
      1,
      10,
      "Pikachu",
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it("should find cards by search string", async () => {
    mockPokemonCardService.findBySearch.mockResolvedValue([{ id: "c-1" }]);
    const result = await controller.findBySearch("mew");
    expect(result).toEqual([{ id: "c-1" }]);
    expect(mockPokemonCardService.findBySearch).toHaveBeenCalledWith("mew");
  });

  it("should find a random card", async () => {
    mockPokemonCardService.findRandom.mockResolvedValue({ id: "c-rand" });
    const result = await controller.findRandom("serie-1", "Rare", "set-1");
    expect(result).toEqual({ id: "c-rand" });
    expect(mockPokemonCardService.findRandom).toHaveBeenCalledWith(
      "serie-1",
      "Rare",
      "set-1",
    );
  });

  it("should match cards by OCR scan parameters", async () => {
    mockPokemonCardService.findByScanMatch.mockResolvedValue([
      { score: 100, card: { id: "c-1" } },
    ]);
    const result = await controller.scanMatch(
      "Pikachu",
      "025",
      "Base Set",
      "025",
      "102",
    );
    expect(result).toHaveLength(1);
    expect(mockPokemonCardService.findByScanMatch).toHaveBeenCalledWith({
      cardName: "Pikachu",
      localId: "025",
      setName: "Base Set",
      setNumber: "025",
      setTotal: "102",
    });
  });

  it("should find card by ID", async () => {
    mockPokemonCardService.findOne.mockResolvedValue({ id: "c-1" });
    const result = await controller.findOne("c-1");
    expect(result).toEqual({ id: "c-1" });
    expect(mockPokemonCardService.findOne).toHaveBeenCalledWith("c-1");
  });

  it("should update card by ID", async () => {
    const dto = { hp: 120 } as any;
    mockPokemonCardService.update.mockResolvedValue({ id: "c-1", hp: 120 });
    const result = await controller.update("c-1", dto);
    expect(result).toEqual({ id: "c-1", hp: 120 });
    expect(mockPokemonCardService.update).toHaveBeenCalledWith("c-1", dto);
  });

  it("should remove card by ID", async () => {
    mockPokemonCardService.remove.mockResolvedValue(undefined);
    await controller.remove("c-1");
    expect(mockPokemonCardService.remove).toHaveBeenCalledWith("c-1");
  });
});
