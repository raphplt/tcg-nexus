import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CardState } from "src/card-state/entities/card-state.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { DataSource } from "typeorm";
import { CollectionBulkService } from "./collection-bulk.service";
import { ImportMode } from "./dto/collection-bulk.dto";
import { Collection } from "./entities/collection.entity";

describe("CollectionBulkService", () => {
  let service: CollectionBulkService;
  let collectionRepo: any;
  let itemRepo: any;
  let cardRepo: any;
  let cardStateRepo: any;
  let dataSource: any;
  let mockEntityManager: any;

  const mockUser: User = {
    id: 1,
    role: UserRole.USER,
  } as User;

  const otherUser: User = {
    id: 2,
    role: UserRole.USER,
  } as User;

  const adminUser: User = {
    id: 99,
    role: UserRole.ADMIN,
  } as User;

  beforeEach(async () => {
    collectionRepo = {
      findOne: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
      remove: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    cardRepo = {
      findOne: jest.fn(),
    };
    cardStateRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([{ id: 1, code: "NM" }]),
    };
    mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn((entityClass, data) => ({ ...data })),
      save: jest.fn((entityClass, data) => Promise.resolve(data)),
    };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionBulkService,
        {
          provide: getRepositoryToken(Collection),
          useValue: collectionRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: itemRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: cardRepo,
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: cardStateRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<CollectionBulkService>(CollectionBulkService);
  });

  it("escapes formula injection characters in CSV export (COL-04)", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: "col-1",
      user: mockUser,
      isPublic: true,
    });

    itemRepo.find.mockResolvedValue([
      {
        id: 1,
        productKind: ProductKind.CARD,
        pokemonCard: {
          id: "c1",
          tcgDexId: "base1-1",
          localId: "1",
          translations: [{ name: "=cmd|' /C calc'!A0" }], // Malicious formula name
          set: { id: "+badSet" }, // Malicious set name
        },
        variant: "normal",
        language: "fr",
        cardState: { code: "NM" },
        quantity: 1,
        quantityAvailable: 1,
        quantityReserved: 0,
        notes: "-suspiciousNote",
      },
    ]);

    const csv = await service.exportCsv("col-1", mockUser);

    expect(csv).toContain("'=cmd|' /C calc'!A0"); // Escaped formula injection

    expect(csv).toContain("'+badSet"); // Escaped leading +
    expect(csv).toContain("'-suspiciousNote"); // Escaped leading -
  });

  it("bulkDelete rejects deleting items with active marketplace reservations (COL-04)", async () => {
    itemRepo.find.mockResolvedValue([
      {
        id: 10,
        collection: { user: mockUser },
        quantityReserved: 2, // Actively reserved!
      },
    ]);

    await expect(
      service.bulkDelete(mockUser, { itemIds: [10] }),
    ).rejects.toThrow(BadRequestException);
  });

  it("undoOperation rejects reverting if items were already reserved or sold (COL-04)", async () => {
    itemRepo.find.mockResolvedValue([
      {
        id: 10,
        collection: { user: mockUser },
        quantityReserved: 1,
        quantitySold: 0,
        provenance: { operationId: "op-123" },
      },
    ]);

    await expect(
      service.undoOperation(mockUser, { operationId: "op-123" }),
    ).rejects.toThrow(BadRequestException);
  });

  describe("exportCsv", () => {
    it("throws NotFoundException if collection does not exist", async () => {
      collectionRepo.findOne.mockResolvedValue(null);

      await expect(service.exportCsv("missing-col", mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException if collection is private and caller is not the owner", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "private-col",
        isPublic: false,
        user: otherUser,
      });

      await expect(service.exportCsv("private-col", mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("allows admin to export private collections", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "private-col",
        isPublic: false,
        user: otherUser,
      });
      itemRepo.find.mockResolvedValue([]);

      const result = await service.exportCsv("private-col", adminUser);
      expect(result).toContain("id,productKind,cardId");
    });

    it("correctly exports sealed product items", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "col-sealed",
        isPublic: true,
        user: mockUser,
      });
      itemRepo.find.mockResolvedValue([
        {
          id: 55,
          productKind: ProductKind.SEALED,
          sealedProduct: {
            id: "booster-box-1",
            name: "Booster Box 151",
            pokemonSet: { id: "sv3pt5" },
          },
          sealedCondition: "SEALED",
          quantity: 2,
          quantityAvailable: 2,
          quantityReserved: 0,
        },
      ]);

      const csv = await service.exportCsv("col-sealed", mockUser);
      expect(csv).toContain("Booster Box 151");
      expect(csv).toContain("sv3pt5");
    });
  });

  describe("importCsv", () => {
    it("throws NotFoundException if collection does not exist", async () => {
      collectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.importCsv("missing-col", mockUser, {
          csvContent: "cardId,quantity\ncard-1,1",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if collection is owned by another user", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "col-other",
        user: otherUser,
      });

      await expect(
        service.importCsv("col-other", mockUser, {
          csvContent: "cardId,quantity\ncard-1,1",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns idempotent result if operationId was already executed", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "col-1",
        user: mockUser,
      });
      itemRepo.find.mockResolvedValue([
        {
          id: 1,
          provenance: { operationId: "op-fixed" },
        },
      ]);

      const result = await service.importCsv("col-1", mockUser, {
        operationId: "op-fixed",
        csvContent: "cardId,quantity\ncard-1,1",
      });

      expect(result.operationId).toBe("op-fixed");
      expect(result.importedCount).toBe(1);
      expect(result.updatedCount).toBe(0);
    });

    it("throws BadRequestException if CSV content is empty or contains only header", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "col-1",
        user: mockUser,
      });
      itemRepo.find.mockResolvedValue([]);

      await expect(
        service.importCsv("col-1", mockUser, {
          csvContent: "cardId,quantity\n",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("imports new items and records missing card errors", async () => {
      const collection = { id: "col-1", user: mockUser };
      collectionRepo.findOne.mockResolvedValue(collection);
      itemRepo.find.mockResolvedValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: "card-1", name: "Pikachu" }) // found card-1
        .mockResolvedValueOnce(null) // no existing collection item for card-1
        .mockResolvedValueOnce(null) // card-missing not found by cardId
        .mockResolvedValueOnce(null); // card-missing not found by tcgDexId

      const csvContent = [
        "cardId,tcgDexId,quantity,variant,language,cardState",
        "card-1,,2,holo,fr,NM",
        "card-missing,dex-missing,1,normal,fr,NM",
      ].join("\n");

      const result = await service.importCsv("col-1", mockUser, {
        csvContent,
        mode: ImportMode.ADD,
      });

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(3);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it("resolves card by tcgDexId when cardId is not found", async () => {
      const collection = { id: "col-1", user: mockUser };
      collectionRepo.findOne.mockResolvedValue(collection);
      itemRepo.find.mockResolvedValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // cardId lookup returns null
        .mockResolvedValueOnce({ id: "card-resolved-dex", tcgDexId: "base1-4" }) // tcgDexId lookup finds card
        .mockResolvedValueOnce(null); // no existing collection item

      const csvContent = [
        "cardId,tcgDexId,quantity,variant,language",
        "missing-id,base1-4,3,normal,fr",
      ].join("\n");

      const result = await service.importCsv("col-1", mockUser, {
        csvContent,
      });

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
    });

    it("increments quantity on existing item when mode is ADD", async () => {
      const collection = { id: "col-1", user: mockUser };
      collectionRepo.findOne.mockResolvedValue(collection);
      itemRepo.find.mockResolvedValue([]);

      const existingItem = {
        id: 77,
        quantity: 2,
        quantityAvailable: 2,
        variant: "normal",
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: "card-1" }) // found card
        .mockResolvedValueOnce(existingItem); // found existing item

      const csvContent = ["cardId,quantity", "card-1,3"].join("\n");

      const result = await service.importCsv("col-1", mockUser, {
        csvContent,
        mode: ImportMode.ADD,
      });

      expect(result.updatedCount).toBe(1);
      expect(existingItem.quantity).toBe(5);
      expect(existingItem.quantityAvailable).toBe(5);
    });

    it("overwrites quantity on existing item when mode is REPLACE", async () => {
      const collection = { id: "col-1", user: mockUser };
      collectionRepo.findOne.mockResolvedValue(collection);
      itemRepo.find.mockResolvedValue([]);

      const existingItem = {
        id: 77,
        quantity: 5,
        quantityAvailable: 5,
        variant: "normal",
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: "card-1" })
        .mockResolvedValueOnce(existingItem);

      const csvContent = ["cardId,quantity", "card-1,2"].join("\n");

      const result = await service.importCsv("col-1", mockUser, {
        csvContent,
        mode: ImportMode.REPLACE,
      });

      expect(result.updatedCount).toBe(1);
      expect(existingItem.quantity).toBe(2);
      expect(existingItem.quantityAvailable).toBe(2);
    });
  });

  describe("bulkMove", () => {
    it("throws NotFoundException if target collection does not exist", async () => {
      collectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.bulkMove(mockUser, {
          targetCollectionId: "missing-target",
          itemIds: [1, 2],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if target collection is owned by another user", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "target-other",
        user: otherUser,
      });

      await expect(
        service.bulkMove(mockUser, {
          targetCollectionId: "target-other",
          itemIds: [1, 2],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns movedCount 0 if itemIds is empty", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "target-col",
        user: mockUser,
      });
      itemRepo.find.mockResolvedValue([]);

      const result = await service.bulkMove(mockUser, {
        targetCollectionId: "target-col",
        itemIds: [],
      });

      expect(result.movedCount).toBe(0);
    });

    it("throws ForbiddenException if an item belongs to another user's collection", async () => {
      collectionRepo.findOne.mockResolvedValue({
        id: "target-col",
        user: mockUser,
      });
      itemRepo.find.mockResolvedValue([
        {
          id: 1,
          collection: { user: otherUser },
        },
      ]);

      await expect(
        service.bulkMove(mockUser, {
          targetCollectionId: "target-col",
          itemIds: [1],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("moves items successfully to target collection", async () => {
      const targetCol = { id: "target-col", user: mockUser };
      collectionRepo.findOne.mockResolvedValue(targetCol);

      const item1 = { id: 1, collection: { user: mockUser } };
      const item2 = { id: 2, collection: { user: mockUser } };
      itemRepo.find.mockResolvedValue([item1, item2]);

      const result = await service.bulkMove(mockUser, {
        targetCollectionId: "target-col",
        itemIds: [1, 2],
      });

      expect(result.movedCount).toBe(2);
      expect((item1 as any).collection).toBe(targetCol);
      expect((item2 as any).collection).toBe(targetCol);
      expect(itemRepo.save).toHaveBeenCalledWith([item1, item2]);
    });
  });

  describe("bulkDelete", () => {
    it("returns deletedCount 0 if itemIds is empty", async () => {
      itemRepo.find.mockResolvedValue([]);

      const result = await service.bulkDelete(mockUser, { itemIds: [] });
      expect(result.deletedCount).toBe(0);
    });

    it("throws ForbiddenException if item belongs to another user", async () => {
      itemRepo.find.mockResolvedValue([
        {
          id: 5,
          collection: { user: otherUser },
          quantityReserved: 0,
        },
      ]);

      await expect(
        service.bulkDelete(mockUser, { itemIds: [5] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("successfully deletes unreserved items", async () => {
      const item1 = {
        id: 1,
        collection: { user: mockUser },
        quantityReserved: 0,
      };
      itemRepo.find.mockResolvedValue([item1]);

      const result = await service.bulkDelete(mockUser, { itemIds: [1] });
      expect(result.deletedCount).toBe(1);
      expect(itemRepo.remove).toHaveBeenCalledWith([item1]);
    });
  });

  describe("undoOperation", () => {
    it("throws NotFoundException if no items found for the operationId", async () => {
      itemRepo.find.mockResolvedValue([]);

      await expect(
        service.undoOperation(mockUser, { operationId: "op-unknown" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if an affected item belongs to another user", async () => {
      itemRepo.find.mockResolvedValue([
        {
          id: 1,
          collection: { user: otherUser },
          quantityReserved: 0,
          quantitySold: 0,
          provenance: { operationId: "op-foreign" },
        },
      ]);

      await expect(
        service.undoOperation(mockUser, { operationId: "op-foreign" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("successfully reverts an unreserved operation", async () => {
      const item = {
        id: 10,
        collection: { user: mockUser },
        quantityReserved: 0,
        quantitySold: 0,
        provenance: { operationId: "op-valid" },
      };
      itemRepo.find.mockResolvedValue([item]);

      const result = await service.undoOperation(mockUser, {
        operationId: "op-valid",
      });

      expect(result.revertedCount).toBe(1);
      expect(itemRepo.remove).toHaveBeenCalledWith([item]);
    });
  });
});
