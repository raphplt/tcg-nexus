import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { R2StorageService } from "../common/r2-storage.service";
import { PokemonSetController } from "./pokemon-set.controller";
import { PokemonSetService } from "./pokemon-set.service";

describe("PokemonSetController", () => {
  let controller: PokemonSetController;

  const mockPokemonSetService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findVisual: jest.fn(),
    updateVisual: jest.fn(),
  };

  const mockR2StorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonSetController],
      providers: [
        {
          provide: PokemonSetService,
          useValue: mockPokemonSetService,
        },
        {
          provide: R2StorageService,
          useValue: mockR2StorageService,
        },
      ],
    }).compile();

    controller = module.get<PokemonSetController>(PokemonSetController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("CRUD endpoints", () => {
    it("should create pokemon set", async () => {
      mockPokemonSetService.create.mockResolvedValue({ id: "set-1" });
      const result = await controller.create({ id: "set-1" } as any);
      expect(result).toEqual({ id: "set-1" });
      expect(mockPokemonSetService.create).toHaveBeenCalledWith({
        id: "set-1",
      });
    });

    it("should find all pokemon sets", async () => {
      mockPokemonSetService.findAll.mockResolvedValue([{ id: "set-1" }]);
      const result = await controller.findAll(10);
      expect(result).toEqual([{ id: "set-1" }]);
      expect(mockPokemonSetService.findAll).toHaveBeenCalledWith(10);
    });

    it("should find one set by id", async () => {
      mockPokemonSetService.findOne.mockResolvedValue({ id: "set-1" });
      const result = await controller.findOne("set-1");
      expect(result).toEqual({ id: "set-1" });
    });

    it("should update set", async () => {
      mockPokemonSetService.update.mockResolvedValue({ id: "set-1" });
      const result = await controller.update("set-1", {} as any);
      expect(result).toEqual({ id: "set-1" });
    });

    it("should remove set", async () => {
      mockPokemonSetService.remove.mockResolvedValue({ success: true });
      const result = await controller.remove("set-1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("uploadLogo & uploadSymbol", () => {
    const mockFile: Express.Multer.File = {
      buffer: Buffer.from("image"),
      originalname: "logo.webp",
      mimetype: "image/webp",
      fieldname: "file",
      encoding: "7bit",
      size: 5,
      stream: null as any,
      destination: "",
      filename: "",
      path: "",
    };

    it("should throw BadRequestException if no file provided", async () => {
      await expect(
        controller.uploadLogo("set-1", null as any, "fr"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.uploadSymbol("set-1", null as any, "fr"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if set does not exist", async () => {
      mockPokemonSetService.findOne.mockResolvedValue(null);

      await expect(
        controller.uploadLogo("missing", mockFile, "fr"),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.uploadSymbol("missing", mockFile, "fr"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should upload logo, replace old visual, and update record", async () => {
      mockPokemonSetService.findOne.mockResolvedValue({ id: "set-1" });
      mockPokemonSetService.findVisual.mockResolvedValue({
        logo: "old-logo.webp",
      });
      mockR2StorageService.uploadFile.mockResolvedValue(
        "https://cdn.tcg-nexus.org/sets/set-1/fr/logo.webp",
      );
      mockPokemonSetService.updateVisual.mockResolvedValue({
        id: "set-1",
        logo: "https://cdn.tcg-nexus.org/sets/set-1/fr/logo.webp",
      });

      const result = await controller.uploadLogo("set-1", mockFile, "fr");
      expect(result.logo).toBeDefined();
      expect(mockR2StorageService.deleteFile).toHaveBeenCalledWith(
        "old-logo.webp",
      );
      expect(mockPokemonSetService.updateVisual).toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if R2 upload fails", async () => {
      mockPokemonSetService.findOne.mockResolvedValue({ id: "set-1" });
      mockPokemonSetService.findVisual.mockResolvedValue(null);
      mockR2StorageService.uploadFile.mockResolvedValue(null);

      await expect(
        controller.uploadLogo("set-1", mockFile, "fr"),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("should upload symbol and update visual", async () => {
      mockPokemonSetService.findOne.mockResolvedValue({ id: "set-1" });
      mockPokemonSetService.findVisual.mockResolvedValue({
        symbol: "old-sym.png",
      });
      mockR2StorageService.uploadFile.mockResolvedValue(
        "https://cdn.tcg-nexus.org/sets/set-1/fr/symbol.png",
      );
      mockPokemonSetService.updateVisual.mockResolvedValue({
        id: "set-1",
        symbol: "https://cdn.tcg-nexus.org/sets/set-1/fr/symbol.png",
      });

      const result = await controller.uploadSymbol("set-1", mockFile, "fr");
      expect(result.symbol).toBeDefined();
      expect(mockR2StorageService.deleteFile).toHaveBeenCalledWith(
        "old-sym.png",
      );
    });
  });
});
