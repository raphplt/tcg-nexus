import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import {
  CardState,
  CardStateCode,
} from "../card-state/entities/card-state.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { Collection } from "../collection/entities/collection.entity";
import { Currency } from "../common/enums/currency";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { DeliveryReceiptService } from "./delivery-receipt.service";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";

describe("DeliveryReceiptService", () => {
  let service: DeliveryReceiptService;
  let orderRepo: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let orderItemRepo: Partial<Record<keyof Repository<OrderItem>, jest.Mock>>;
  let collectionRepo: Partial<Record<keyof Repository<Collection>, jest.Mock>>;
  let collectionItemRepo: Partial<
    Record<keyof Repository<CollectionItem>, jest.Mock>
  >;
  let cardStateRepo: Partial<Record<keyof Repository<CardState>, jest.Mock>>;
  let auditService: Partial<Record<keyof AuditService, jest.Mock>>;

  const mockBuyer = {
    id: 10,
    email: "buyer@test.com",
    role: UserRole.USER,
  } as User;

  const mockOtherUser = {
    id: 99,
    email: "other@test.com",
    role: UserRole.USER,
  } as User;

  const mockOrder = {
    id: 42,
    buyer: mockBuyer,
    status: OrderStatus.DELIVERED,
    currency: Currency.EUR,
    orderItems: [
      {
        id: 101,
        productName: "Charizard ex",
        unitPrice: 50,
        quantity: 1,
        productCondition: "NM",
        productLanguage: "fr",
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
        deliveredAt: new Date(),
        listing: {
          pokemonCard: { id: "sv3-125" },
        },
      },
    ],
  } as unknown as Order;

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
    };

    orderItemRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    collectionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: "col-default" })),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    collectionItemRepo = {
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 701 })),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    cardStateRepo = {
      findOne: jest.fn(),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryReceiptService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepo,
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: collectionRepo,
        },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: collectionItemRepo,
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: cardStateRepo,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<DeliveryReceiptService>(DeliveryReceiptService);
  });

  describe("getDeliveredOrderPreview", () => {
    it("throws NotFoundException if order does not exist", async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getReceiptImportPreview(42, mockBuyer),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if user is not buyer and not admin", async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);

      await expect(
        service.getReceiptImportPreview(42, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns items with alreadyImported flags", async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      collectionRepo.find!.mockResolvedValue([
        {
          id: "col-1",
          items: [
            {
              id: 55,
              provenance: { orderItemId: 101 },
            },
          ],
        },
      ]);

      const preview = await service.getReceiptImportPreview(42, mockBuyer);

      expect(preview.orderId).toBe(42);
      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].alreadyImported).toBe(true);
      expect(preview.items[0].existingCollectionItemId).toBe(55);
    });
  });

  describe("importDeliveredItems", () => {
    it("creates collection item with order provenance and records audit", async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      collectionRepo.findOne!.mockResolvedValue({
        id: "col-target",
        name: "My Collection",
      });
      collectionItemRepo.find!.mockResolvedValue([]);
      cardStateRepo.findOne!.mockResolvedValue({
        id: 1,
        code: CardStateCode.NM,
        label: "Near Mint",
      });

      const result = await service.importDeliveredItems(42, mockBuyer, {
        collectionId: "col-target",
        items: [{ orderItemId: 101, condition: "NM" }],
      });

      expect(result.importedCount).toBe(1);
      expect(result.collectionId).toBe("col-target");
      expect(collectionItemRepo.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalled();
    });

    it("rejects import if item was already imported and duplicates are disallowed", async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      collectionRepo.findOne!.mockResolvedValue({
        id: "col-target",
        name: "My Collection",
      });
      collectionItemRepo.find!.mockResolvedValue([
        {
          id: 700,
          provenance: { orderItemId: 101 },
        },
      ]);

      await expect(
        service.importDeliveredItems(42, mockBuyer, {
          collectionId: "col-target",
          items: [{ orderItemId: 101 }],
          allowDuplicates: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
