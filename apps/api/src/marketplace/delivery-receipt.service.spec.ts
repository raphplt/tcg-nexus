import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
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
import { ReceiptImport } from "./entities/receipt-import.entity";

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
  let receipts: ReceiptImport[];
  let created: CollectionItem[];

  const mockBuyer = {
    id: 10,
    email: "buyer@test.com",
    role: UserRole.USER,
  } as User;

  const mockStaff = {
    id: 2,
    email: "staff@test.com",
    role: UserRole.ADMIN,
  } as User;

  const mockOtherUser = {
    id: 99,
    email: "other@test.com",
    role: UserRole.USER,
  } as User;

  const buildOrder = (overrides: Partial<OrderItem> = {}): Order =>
    ({
      id: 42,
      buyer: mockBuyer,
      status: OrderStatus.DELIVERED,
      currency: Currency.EUR,
      orderItems: [
        {
          id: 101,
          productName: "Charizard ex",
          unitPrice: 50,
          quantity: 2,
          productCondition: "NM",
          productLanguage: "fr",
          fulfillmentStatus: FulfillmentStatus.DELIVERED,
          deliveredAt: new Date(),
          receiptConfirmedAt: new Date(),
          listing: { pokemonCard: { id: "sv3-125" } },
          ...overrides,
        },
      ],
    }) as unknown as Order;

  /** Records a receipt as the service would have, for accumulated-quantity setups. */
  const seedReceipt = (quantity: number, requestKey: string) => {
    receipts.push({
      id: `rec-${receipts.length + 1}`,
      orderItem: { id: 101 } as OrderItem,
      buyer: mockBuyer,
      collection: { id: "col-other" } as Collection,
      collectionItem: { id: 700 } as CollectionItem,
      quantity,
      requestKey,
      createdAt: new Date(),
    } as ReceiptImport);
  };

  const receiptRepo = () => ({
    find: jest.fn(async () => receipts),
  });

  beforeEach(async () => {
    receipts = [];
    created = [];

    orderRepo = { findOne: jest.fn() };
    orderItemRepo = { findOne: jest.fn(), find: jest.fn() };
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
    cardStateRepo = { findOne: jest.fn() };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };

    // The manager mirrors the repositories the service writes through, so the
    // receipts recorded in a transaction are visible to the next iteration.
    const manager = {
      findOne: jest.fn(async (target: unknown, options: never) => {
        if (target === ReceiptImport) {
          const where = (options as { where: { requestKey: string } }).where;
          return (
            receipts.find(
              (receipt) => receipt.requestKey === where.requestKey,
            ) ?? null
          );
        }
        return null;
      }),
      create: jest.fn((_target: unknown, data: unknown) => ({
        ...(data as Record<string, unknown>),
      })),
      save: jest.fn(
        async (target: unknown, entity: Record<string, unknown>) => {
          if (target === ReceiptImport) {
            receipts.push(entity as unknown as ReceiptImport);
            return entity;
          }
          const item = { id: 700 + created.length + 1, ...entity };
          created.push(item as unknown as CollectionItem);
          return item;
        },
      ),
      getRepository: () => ({ find: jest.fn(async () => receipts) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryReceiptService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        {
          provide: getRepositoryToken(CollectionItem),
          useValue: collectionItemRepo,
        },
        { provide: getRepositoryToken(CardState), useValue: cardStateRepo },
        {
          provide: getRepositoryToken(ReceiptImport),
          useValue: receiptRepo(),
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (work: (m: unknown) => Promise<unknown>) =>
              work(manager),
          },
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DeliveryReceiptService>(DeliveryReceiptService);
  });

  describe("getReceiptImportPreview", () => {
    it("throws NotFoundException if order does not exist", async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getReceiptImportPreview(42, mockBuyer),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if user is not buyer and not staff", async () => {
      orderRepo.findOne!.mockResolvedValue(buildOrder());

      await expect(
        service.getReceiptImportPreview(42, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it("reports received and remaining copies wherever they were filed", async () => {
      orderRepo.findOne!.mockResolvedValue(buildOrder());
      seedReceipt(1, "receipt:101:col-other:1");

      const preview = await service.getReceiptImportPreview(42, mockBuyer);

      expect(preview.items[0].alreadyImported).toBe(true);
      expect(preview.items[0].importedQuantity).toBe(1);
      expect(preview.items[0].remainingQuantity).toBe(1);
      expect(preview.items[0].existingCollectionItemId).toBe(700);
    });
  });

  describe("importDeliveredItems", () => {
    beforeEach(() => {
      orderRepo.findOne!.mockResolvedValue(buildOrder());
      collectionRepo.findOne!.mockResolvedValue({
        id: "col-target",
        name: "My Collection",
      });
      cardStateRepo.findOne!.mockResolvedValue({
        id: 1,
        code: CardStateCode.NM,
        label: "Near Mint",
      });
    });

    it("creates the collection item, its receipt and an audit record", async () => {
      const result = await service.importDeliveredItems(42, mockBuyer, {
        collectionId: "col-target",
        items: [{ orderItemId: 101, condition: "NM" }],
      });

      expect(result.importedCount).toBe(1);
      expect(result.collectionId).toBe("col-target");
      expect(created[0].quantity).toBe(2);
      expect(created[0].provenance?.orderItemId).toBe(101);
      expect(receipts).toHaveLength(1);
      expect(receipts[0].quantity).toBe(2);
      expect(auditService.record).toHaveBeenCalled();
    });

    it("refuses a line the buyer has not confirmed receiving", async () => {
      orderRepo.findOne!.mockResolvedValue(
        buildOrder({ receiptConfirmedAt: null } as Partial<OrderItem>),
      );

      await expect(
        service.importDeliveredItems(42, mockBuyer, {
          collectionId: "col-target",
          items: [{ orderItemId: 101 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(receipts).toHaveLength(0);
    });

    it("lets staff record a receipt on the buyer's behalf", async () => {
      orderRepo.findOne!.mockResolvedValue(
        buildOrder({ receiptConfirmedAt: null } as Partial<OrderItem>),
      );
      collectionRepo.findOne!.mockResolvedValue({ id: "col-target" });

      const result = await service.importDeliveredItems(42, mockStaff, {
        collectionId: "col-target",
        items: [{ orderItemId: 101 }],
      });

      expect(result.importedCount).toBe(1);
    });

    it("counts copies already received into another collection", async () => {
      // The audited defect: the same purchase imported into a second collection.
      seedReceipt(2, "receipt:101:col-other:remaining");

      await expect(
        service.importDeliveredItems(42, mockBuyer, {
          collectionId: "col-target",
          items: [{ orderItemId: 101 }],
          allowDuplicates: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(created).toHaveLength(0);
    });

    it("receives only the copies still remaining on the line", async () => {
      seedReceipt(1, "receipt:101:col-other:1");

      const result = await service.importDeliveredItems(42, mockBuyer, {
        collectionId: "col-target",
        items: [{ orderItemId: 101, quantity: 1 }],
        allowDuplicates: true,
      });

      expect(result.importedCount).toBe(1);
      expect(created[0].quantity).toBe(1);

      await expect(
        service.importDeliveredItems(42, mockBuyer, {
          collectionId: "col-target",
          items: [{ orderItemId: 101, quantity: 1, requestKey: "third" }],
          allowDuplicates: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses more copies than the line still has", async () => {
      await expect(
        service.importDeliveredItems(42, mockBuyer, {
          collectionId: "col-target",
          items: [{ orderItemId: 101, quantity: 3 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("returns the existing receipt when the same request is retried", async () => {
      const request = {
        collectionId: "col-target",
        items: [{ orderItemId: 101, requestKey: "retry-key" }],
      };

      await service.importDeliveredItems(42, mockBuyer, request);
      await service.importDeliveredItems(42, mockBuyer, request);

      expect(receipts).toHaveLength(1);
      expect(created).toHaveLength(1);
    });

    it("skips a line that already has a receipt unless duplicates are allowed", async () => {
      seedReceipt(1, "receipt:101:col-other:1");

      await expect(
        service.importDeliveredItems(42, mockBuyer, {
          collectionId: "col-target",
          items: [{ orderItemId: 101 }],
          allowDuplicates: false,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(created).toHaveLength(0);
    });
  });
});
