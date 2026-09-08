import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { Currency } from "../common/enums/currency";
import { InventoryDisposition } from "../common/enums/inventory-disposition";
import { RefundStatus } from "../common/enums/refund-status";
import { ReturnStatus } from "../common/enums/return-status";
import { UserRole } from "../common/enums/user";
import { OutboxService } from "../outbox/outbox.service";
import { User } from "../user/entities/user.entity";
import { Listing } from "./entities/listing.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Order, OrderStatus } from "./entities/order.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { RefundLine } from "./entities/refund-line.entity";
import { RefundOperation } from "./entities/refund-operation.entity";
import { ReturnItem } from "./entities/return-item.entity";
import { RefundFinanceService } from "./refund-finance.service";
import { RefundService } from "./refund.service";
import { StripeService } from "./stripe.service";

describe("RefundService", () => {
  let service: RefundService;
  const finance = { createRefund: jest.fn() };
  let orderRepo: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let refundOpRepo: Partial<
    Record<keyof Repository<RefundOperation>, jest.Mock>
  >;
  let returnItemRepo: Partial<Record<keyof Repository<ReturnItem>, jest.Mock>>;
  let orderItemRepo: Partial<Record<keyof Repository<OrderItem>, jest.Mock>>;
  let listingRepo: Partial<Record<keyof Repository<Listing>, jest.Mock>>;
  let stripeService: Partial<Record<keyof StripeService, jest.Mock>>;
  let auditService: Partial<Record<keyof AuditService, jest.Mock>>;
  let outboxService: Partial<Record<keyof OutboxService, jest.Mock>>;
  let dataSource: Partial<Record<keyof DataSource, jest.Mock>>;

  const mockBuyer: User = {
    id: 10,
    role: UserRole.USER,
    email: "buyer@test.com",
  } as unknown as User;

  const mockSeller: User = {
    id: 20,
    role: UserRole.USER,
    email: "seller@test.com",
  } as unknown as User;

  const mockOrder = (overrides: Partial<Order> = {}): Order => {
    const order = new Order();
    order.id = 42;
    order.totalAmount = 100;
    order.shippingAmount = 10;
    order.currency = Currency.EUR;
    order.status = OrderStatus.PAID;
    order.buyer = mockBuyer;
    order.orderItems = [
      {
        id: 101,
        quantity: 2,
        unitPrice: 45,
        shippingCost: 5,
        seller: mockSeller,
        listing: { id: 201, quantityAvailable: 5 } as Listing,
      } as unknown as OrderItem,
    ];
    order.payments = [
      {
        id: 1,
        status: PaymentStatus.COMPLETED,
        transactionId: "pi_test_123",
        amount: 100,
      } as unknown as PaymentTransaction,
    ];
    return Object.assign(order, overrides);
  };

  beforeEach(async () => {
    finance.createRefund.mockReset();
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    refundOpRepo = {
      find: jest.fn(),
      create: jest.fn((dto) => dto as any),
      save: jest.fn((entity) => Promise.resolve({ id: 99, ...entity } as any)),
    };
    returnItemRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto as any),
      save: jest.fn((entity) =>
        Promise.resolve({ id: "ret-uuid-1", ...entity } as any),
      ),
    };
    orderItemRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    listingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    stripeService = {
      createRefund: jest
        .fn()
        .mockResolvedValue({ id: "re_stripe_123", status: "succeeded" } as any),
    };
    auditService = {
      record: jest.fn().mockResolvedValue({} as any),
    };
    outboxService = {
      record: jest.fn().mockResolvedValue({} as any),
    };

    const mockManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((cls, dto) => dto),
      save: jest.fn((clsOrEntity, maybeEntity) => {
        const entity = maybeEntity ?? clsOrEntity;
        return Promise.resolve({ id: 1, ...entity });
      }),
      increment: jest.fn().mockResolvedValue({}),
    };

    dataSource = {
      transaction: jest.fn(async (cb: (m: any) => Promise<any>) =>
        cb(mockManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: RefundFinanceService, useValue: finance },
        {
          provide: getRepositoryToken(RefundOperation),
          useValue: refundOpRepo,
        },
        { provide: getRepositoryToken(RefundLine), useValue: {} },
        { provide: getRepositoryToken(ReturnItem), useValue: returnItemRepo },
        { provide: getRepositoryToken(PaymentTransaction), useValue: {} },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(Listing), useValue: listingRepo },
        { provide: StripeService, useValue: stripeService },
        { provide: AuditService, useValue: auditService },
        { provide: OutboxService, useValue: outboxService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
  });

  describe("calculateRemainingRefundable", () => {
    it("returns full totalAmount when no refunds have occurred", async () => {
      const order = mockOrder({ totalAmount: 100 });
      orderRepo.findOne!.mockResolvedValue(order);
      refundOpRepo.find!.mockResolvedValue([]);

      const balance = await service.calculateRemainingRefundable(order.id);

      expect(balance.totalAmount).toBe(100);
      expect(balance.alreadyRefunded).toBe(0);
      expect(balance.remainingAmount).toBe(100);
    });

    it("subtracts succeeded refunds from total refundable balance", async () => {
      const order = mockOrder({
        totalAmount: 100,
        refundOperations: [
          {
            id: 1,
            amount: 30,
            status: RefundStatus.SUCCEEDED,
          } as unknown as RefundOperation,
          {
            id: 2,
            amount: 20,
            status: RefundStatus.SUCCEEDED,
          } as unknown as RefundOperation,
          {
            id: 3,
            amount: 40,
            status: RefundStatus.FAILED,
          } as unknown as RefundOperation,
        ],
      });
      orderRepo.findOne!.mockResolvedValue(order);

      const balance = await service.calculateRemainingRefundable(order.id);

      expect(balance.totalAmount).toBe(100);
      expect(balance.alreadyRefunded).toBe(50);
      expect(balance.remainingAmount).toBe(50);
    });

    it("throws NotFoundException if order does not exist", async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      await expect(service.calculateRemainingRefundable(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createRefund", () => {
    it("delegates to the durable finance boundary without performing an independent provider call", async () => {
      const payload = {
        requestKey: "retry-1",
        lines: [{ orderItemId: 101, quantity: 1, amount: 30 }],
      };
      finance.createRefund.mockResolvedValue({
        id: "operation",
        status: RefundStatus.PENDING,
      });
      expect(await service.createRefund(42, payload, mockSeller)).toEqual({
        id: "operation",
        status: RefundStatus.PENDING,
      });
      expect(finance.createRefund).toHaveBeenCalledWith(
        42,
        payload,
        mockSeller,
      );
      expect(stripeService.createRefund).not.toHaveBeenCalled();
      expect(listingRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("createReturnRequest", () => {
    it("creates a return item with REQUESTED status and default disposition", async () => {
      const order = mockOrder();
      const orderItem = {
        id: 101,
        quantity: 2,
        order,
        listing: { id: 201 } as Listing,
      } as unknown as OrderItem;

      orderItemRepo.findOne!.mockResolvedValue(orderItem);

      const res = await service.createReturnRequest(
        101,
        { quantity: 1, reason: "Wrong card received" },
        mockBuyer,
      );

      expect(res.status).toBe(ReturnStatus.REQUESTED);
      expect(res.disposition).toBe(InventoryDisposition.NO_RETURN_REQUIRED);
      expect(outboxService.record).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalled();
    });

    it("throws BadRequestException if requested return quantity exceeds order item quantity", async () => {
      const order = mockOrder();
      const orderItem = {
        id: 101,
        quantity: 2,
        order,
      } as unknown as OrderItem;

      orderItemRepo.findOne!.mockResolvedValue(orderItem);

      await expect(
        service.createReturnRequest(
          101,
          { quantity: 5, reason: "Too many items" },
          mockBuyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("setReturnDisposition", () => {
    it("increments listing stock when disposition is RESTOCK", async () => {
      const listing = { id: 201, quantityAvailable: 3 } as Listing;
      const orderItem = {
        id: 101,
        listing,
        seller: mockSeller,
        order: { id: 42, userId: 10 },
      } as unknown as OrderItem;

      const returnItem = {
        id: "ret-uuid-1",
        orderItemId: 101,
        quantity: 2,
        orderItem,
        status: ReturnStatus.REQUESTED,
        disposition: InventoryDisposition.NO_RETURN_REQUIRED,
      } as unknown as ReturnItem;

      returnItemRepo.findOne!.mockResolvedValue(returnItem);

      const mockManager = {
        increment: jest.fn().mockResolvedValue({}),
        save: jest.fn((cls, entity) => Promise.resolve(entity)),
      };
      dataSource.transaction!.mockImplementation((cb: any) => cb(mockManager));

      await service.setReturnDisposition(
        "ret-uuid-1",
        {
          disposition: InventoryDisposition.RESTOCK,
          notes: "Card in perfect mint condition",
        },
        mockSeller,
      );

      expect(mockManager.increment).toHaveBeenCalledWith(
        Listing,
        { id: 201 },
        "quantityAvailable",
        2,
      );
      expect(auditService.record).toHaveBeenCalled();
      expect(outboxService.record).toHaveBeenCalled();
    });

    it("does NOT increment listing stock when disposition is DAMAGED", async () => {
      const listing = { id: 201, quantityAvailable: 3 } as Listing;
      const orderItem = {
        id: 101,
        listing,
        seller: mockSeller,
        order: { id: 42, userId: 10 },
      } as unknown as OrderItem;

      const returnItem = {
        id: "ret-uuid-2",
        orderItemId: 101,
        quantity: 2,
        orderItem,
        status: ReturnStatus.REQUESTED,
        disposition: InventoryDisposition.NO_RETURN_REQUIRED,
      } as unknown as ReturnItem;

      returnItemRepo.findOne!.mockResolvedValue(returnItem);

      const mockManager = {
        increment: jest.fn().mockResolvedValue({}),
        save: jest.fn((cls, entity) => Promise.resolve(entity)),
      };
      dataSource.transaction!.mockImplementation((cb: any) => cb(mockManager));

      await service.setReturnDisposition(
        "ret-uuid-2",
        {
          disposition: InventoryDisposition.DAMAGED,
          notes: "Bent during transit",
        },
        mockSeller,
      );

      expect(mockManager.increment).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalled();
    });
  });
});
