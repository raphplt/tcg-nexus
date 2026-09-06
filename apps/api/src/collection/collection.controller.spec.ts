import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { CollectionBulkService } from "./collection-bulk.service";
import { CollectionCompletionService } from "./collection-completion.service";
import { CollectionValuationService } from "./collection-valuation.service";
import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";
import { Collection } from "./entities/collection.entity";

describe("CollectionController", () => {
  let controller: CollectionController;

  const mockCollectionService = {
    findAll: jest.fn(),
    findByUserId: jest.fn(),
    findOneById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAllPaginated: jest.fn(),
    findCollectionItemsPaginated: jest.fn(),
    getSetRarities: jest.fn(),
    addCardToCollection: jest.fn(),
    removeCardFromCollection: jest.fn(),
    removeCollectionItem: jest.fn(),
  };

  const mockCompletionService = {
    calculateCompletion: jest.fn(),
  };

  const mockValuationService = {
    calculateValuation: jest.fn(),
  };

  const mockBulkService = {
    exportCsv: jest.fn(),
    importCsv: jest.fn(),
    bulkMove: jest.fn(),
    bulkDelete: jest.fn(),
    undoOperation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        {
          provide: CollectionService,
          useValue: mockCollectionService,
        },
        {
          provide: CollectionCompletionService,
          useValue: mockCompletionService,
        },
        {
          provide: CollectionValuationService,
          useValue: mockValuationService,
        },
        {
          provide: CollectionBulkService,
          useValue: mockBulkService,
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: {},
        },
      ],
    }).compile();


    controller = module.get<CollectionController>(CollectionController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should find all public collections", async () => {
    mockCollectionService.findAll.mockResolvedValue([{ id: "1" }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: "1" }]);
  });

  it("should return paginated collections", async () => {
    mockCollectionService.findAllPaginated.mockResolvedValue({ total: 1 });
    await expect(
      controller.findAllPaginated(1 as any, 10 as any),
    ).resolves.toEqual({
      total: 1,
    });
  });

  it("should find collections by user", async () => {
    mockCollectionService.findByUserId.mockResolvedValue([{ id: "u" }]);
    await expect(controller.findByUserId("2")).resolves.toEqual([{ id: "u" }]);
  });

  it("should find collection items with defaults", async () => {
    mockCollectionService.findCollectionItemsPaginated.mockResolvedValue({
      data: [],
    });
    await expect(
      controller.findCollectionItems(
        "col",
        undefined,
        undefined,
        "s",
        "name",
        "ASC",
      ),
    ).resolves.toEqual({ data: [] });
    expect(
      mockCollectionService.findCollectionItemsPaginated,
    ).toHaveBeenCalledWith(
      "col",
      1,
      10,
      "s",
      "name",
      "ASC",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      false,
    );
  });

  it("should find one collection by id", async () => {
    mockCollectionService.findOneById.mockResolvedValue({ id: "1" });
    await expect(controller.findOneById("1")).resolves.toEqual({ id: "1" });
  });

  it("passes the authenticated owner separately from the creation payload", async () => {
    const dto = { name: "New" };
    const user = Object.assign(new User(), { id: 3 });
    const created = Object.assign(new Collection(), {
      id: "new",
      name: dto.name,
      user,
    });
    mockCollectionService.create.mockResolvedValue(created);
    expect(await controller.create(dto, user)).toBe(created);
    expect(mockCollectionService.create).toHaveBeenCalledWith(dto, 3);
    expect(dto).toEqual({ name: "New" });
  });

  it("should update collection", async () => {
    mockCollectionService.update.mockResolvedValue({
      id: "1",
      name: "Updated",
    });
    await expect(
      controller.update("1", { name: "Updated" } as any, { id: 3 } as any),
    ).resolves.toEqual({ id: "1", name: "Updated" });
  });

  it("should delete collection and return message", async () => {
    mockCollectionService.delete.mockResolvedValue(undefined);
    await expect(controller.delete("1", { id: 3 } as any)).resolves.toEqual({
      message: "Collection supprimée avec succès",
    });
  });

  it("should get collections for current user", async () => {
    mockCollectionService.findByUserId.mockResolvedValue([{ id: "mine" }]);
    await expect(
      controller.getMyCollections({ id: 5 } as any),
    ).resolves.toEqual([{ id: "mine" }]);
  });
});
