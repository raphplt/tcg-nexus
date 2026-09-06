import { BadRequestException } from "@nestjs/common";
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
import { Collection } from "./entities/collection.entity";

describe("CollectionBulkService", () => {
  let service: CollectionBulkService;
  let collectionRepo: any;
  let itemRepo: any;
  let cardRepo: any;
  let cardStateRepo: any;
  let dataSource: any;

  const mockUser: User = {
    id: 1,
    role: UserRole.USER,
  } as User;

  beforeEach(async () => {
    collectionRepo = {
      findOne: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    cardRepo = {
      findOne: jest.fn(),
    };
    cardStateRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([{ id: 1, code: "NM" }]),
    };
    dataSource = {
      transaction: jest.fn(),
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
});
