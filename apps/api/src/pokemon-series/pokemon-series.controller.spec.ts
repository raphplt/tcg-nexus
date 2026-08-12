import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { R2StorageService } from "../common/r2-storage.service";
import { PokemonSerie } from "./entities/pokemon-serie.entity";
import { PokemonSeriesController } from "./pokemon-series.controller";
import { PokemonSeriesService } from "./pokemon-series.service";

describe("PokemonSeriesController", () => {
  let controller: PokemonSeriesController;

  const mockPokemonSeriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    import: jest.fn(),
  };

  const mockR2StorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonSeriesController],
      providers: [
        {
          provide: PokemonSeriesService,
          useValue: mockPokemonSeriesService,
        },
        {
          provide: getRepositoryToken(PokemonSerie),
          useValue: {},
        },
        {
          provide: R2StorageService,
          useValue: mockR2StorageService,
        },
      ],
    }).compile();

    controller = module.get<PokemonSeriesController>(PokemonSeriesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
