import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PokemonSerieTranslation } from "./entities/pokemon-serie-translation.entity";
import { PokemonSerie } from "./entities/pokemon-serie.entity";
import { PokemonSeriesService } from "./pokemon-series.service";

describe("PokemonSeriesService", () => {
  let service: PokemonSeriesService;

  const mockRepository = {
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [] }),
    })),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockTranslationRepository = {
    upsert: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonSeriesService,
        {
          provide: getRepositoryToken(PokemonSerie),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PokemonSerieTranslation),
          useValue: mockTranslationRepository,
        },
      ],
    }).compile();

    service = module.get<PokemonSeriesService>(PokemonSeriesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should create a pokemon series and its default translation", async () => {
    const dto = { id: "neo", name: "Neo" } as any;
    mockRepository.create.mockReturnValue({ id: "neo" });
    mockRepository.save.mockResolvedValue({ id: "neo" });
    mockTranslationRepository.findOneOrFail.mockResolvedValue({});
    mockRepository.findOne.mockResolvedValue({ id: "neo" });

    await expect(service.create(dto)).resolves.toEqual({ id: "neo" });
    expect(mockTranslationRepository.upsert).toHaveBeenCalledWith(
      { serieId: "neo", locale: "fr", name: "Neo" },
      ["serieId", "locale"],
    );
  });

  it("should find all with custom query builder", async () => {
    await expect(service.findAll()).resolves.toEqual([]);
    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("serie");
  });

  it("should find one series without selecting dropped columns", async () => {
    mockRepository.findOne.mockResolvedValue({ id: "2" });

    await expect(service.findOne("2")).resolves.toEqual({ id: "2" });
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: "2", game: "POKEMON" },
    });
  });

  it("should write the name to the translation of the requested locale", async () => {
    mockTranslationRepository.findOneOrFail.mockResolvedValue({});
    mockRepository.findOne.mockResolvedValue({ id: "3" });

    await expect(
      service.update("3", { name: "Updated", locale: "en" } as any),
    ).resolves.toEqual({ id: "3" });
    expect(mockTranslationRepository.upsert).toHaveBeenCalledWith(
      { serieId: "3", locale: "en", name: "Updated" },
      ["serieId", "locale"],
    );
  });

  it("should leave the logo untouched when only the name changes", async () => {
    mockTranslationRepository.findOneOrFail.mockResolvedValue({});
    mockRepository.findOne.mockResolvedValue({ id: "4" });

    await service.updateVisual("4", "fr", { name: "Base", logo: undefined });

    expect(mockTranslationRepository.upsert).toHaveBeenCalledWith(
      { serieId: "4", locale: "fr", name: "Base" },
      ["serieId", "locale"],
    );
  });

  it("should delete series", async () => {
    mockRepository.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove("4")).resolves.toEqual({ deleted: true });
  });
});
