import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import Stripe from "stripe";
import { DataSource } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { Currency } from "../common/enums/currency";
import { RefundStatus } from "../common/enums/refund-status";
import { UserRole } from "../common/enums/user";
import { OutboxService } from "../outbox/outbox.service";
import { User } from "../user/entities/user.entity";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { OrderItem } from "./entities/order-item.entity";
import { Order, OrderStatus } from "./entities/order.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { RefundLine } from "./entities/refund-line.entity";
import { RefundOperation } from "./entities/refund-operation.entity";
import { financeFingerprint } from "./finance/finance.utils";
import { RefundFinanceService } from "./refund-finance.service";
import { SellerSettlementService } from "./seller-settlement.service";
import { StripeService } from "./stripe.service";

describe("RefundFinanceService", () => {
  let service: RefundFinanceService;
  let dataSource: any;
  let stripeService: any;
  let auditService: any;
  let outboxService: any;
  let settlementService: any;
  let mockEntityManager: any;
  let mockRefundOpRepo: any;
  let mockPaymentRepo: any;

  const mockAdminUser: User = {
    id: 1,
    role: UserRole.ADMIN,
    email: "admin@test.com",
  } as User;

  const mockSellerUser: User = {
    id: 10,
    role: UserRole.USER,
    email: "seller@test.com",
  } as User;

  const mockOtherUser: User = {
    id: 99,
    role: UserRole.USER,
    email: "other@test.com",
  } as User;

  const createMockOrder = (overrides: Partial<Order> = {}): Order => {
    const item = new OrderItem();
    item.id = 101;
    item.quantity = 2;
    item.unitPrice = 25;
    item.shippingCost = 5;
    item.seller = mockSellerUser;

    const payment = new PaymentTransaction();
    payment.id = 501;
    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = "pi_mock_123456";
    payment.amount = 55;
    payment.currency = Currency.EUR;

    const order = new Order();
    order.id = 42;
    order.totalAmount = 55;
    order.shippingAmount = 5;
    order.currency = Currency.EUR;
    order.status = OrderStatus.PAID;
    order.buyer = { id: 2, role: UserRole.USER } as User;
    order.orderItems = [item];
    order.payments = [payment];
    payment.order = order;
    order.refundOperations = [];

    Object.assign(order, overrides);
    return order;
  };

  beforeEach(async () => {
    mockRefundOpRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockPaymentRepo = {
      findOne: jest.fn(),
    };

    mockEntityManager = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entityClass, data) => ({ ...data })),
      save: jest.fn((entityClass, data) => Promise.resolve(data)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(mockEntityManager)),
      getRepository: jest.fn((entity) => {
        if (entity === RefundOperation) return mockRefundOpRepo;
        if (entity === PaymentTransaction) return mockPaymentRepo;
        return { findOne: jest.fn(), update: jest.fn() };
      }),
    };

    stripeService = {
      createRefund: jest.fn(),
      retrieveRefund: jest.fn(),
      findRefundForOperation: jest.fn(),
      listRefunds: jest.fn(),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({ id: "audit-1" }),
    };

    outboxService = {
      record: jest.fn().mockResolvedValue({ id: "outbox-1" }),
    };

    settlementService = {
      onRefundApplied: jest.fn().mockResolvedValue(undefined),
      onRefundReversed: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundFinanceService,
        { provide: DataSource, useValue: dataSource },
        { provide: StripeService, useValue: stripeService },
        { provide: AuditService, useValue: auditService },
        { provide: OutboxService, useValue: outboxService },
        { provide: SellerSettlementService, useValue: settlementService },
      ],
    }).compile();

    service = module.get<RefundFinanceService>(RefundFinanceService);
  });

  describe("createRefund", () => {
    it("throws NotFoundException if order does not exist", async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      const dto: CreateRefundDto = {
        amount: 10,
        reason: "Customer return",
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if non-staff caller is not a seller on the order", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 10,
        lines: [{ orderItemId: 101, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException if non-staff seller does not specify lines", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 10,
      };

      await expect(
        service.createRefund(42, dto, mockSellerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException if refund line does not belong to the order", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        lines: [{ orderItemId: 999, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockSellerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ForbiddenException if seller attempts to refund another seller's item", async () => {
      const order = createMockOrder();
      const anotherSellerItem = new OrderItem();
      anotherSellerItem.id = 102;
      anotherSellerItem.quantity = 1;
      anotherSellerItem.unitPrice = 15;
      anotherSellerItem.shippingCost = 2;
      anotherSellerItem.seller = { id: 88, role: UserRole.USER } as User;
      order.orderItems.push(anotherSellerItem);

      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        lines: [{ orderItemId: 102, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockSellerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns prior operation idempotently when matching requestKey and fingerprint exist", async () => {
      const order = createMockOrder();
      const existingOp = new RefundOperation();
      existingOp.id = "op-idempotent-1";
      existingOp.requestKey = "custom-key";
      const dto: CreateRefundDto = {
        requestKey: "custom-key",
        amount: 20,
        reason: "Wrong item",
        lines: [{ orderItemId: 101, quantity: 1, amount: 20 }],
      };

      existingOp.fingerprint = financeFingerprint({
        amount: 20,
        reason: "Wrong item",
        lines: [
          { orderItemId: 101, quantity: 1, amount: 20, shippingAmount: 0 },
        ],
      });
      existingOp.status = RefundStatus.SUCCEEDED;
      order.refundOperations = [existingOp];

      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const executeSpy = jest
        .spyOn(service, "executeRefund")
        .mockResolvedValue(existingOp);

      const result = await service.createRefund(42, dto, mockAdminUser);
      expect(result).toBe(existingOp);
      expect(executeSpy).toHaveBeenCalledWith(existingOp.id);
    });

    it("throws ConflictException when requestKey matches but payload differs", async () => {
      const order = createMockOrder();
      const existingOp = new RefundOperation();
      existingOp.id = "op-mismatch";
      existingOp.requestKey = "custom-key";
      existingOp.fingerprint = "different-fingerprint";
      order.refundOperations = [existingOp];

      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        requestKey: "custom-key",
        amount: 20,
        reason: "Wrong item",
        lines: [{ orderItemId: 101, quantity: 1, amount: 20 }],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });

    it("throws BadRequestException if order status is not refundable", async () => {
      const order = createMockOrder({ status: OrderStatus.CANCELLED });
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 10,
        lines: [{ orderItemId: 101, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ConflictException if order does not have exactly one completed payment", async () => {
      const order = createMockOrder({ payments: [] });
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 10,
        lines: [{ orderItemId: 101, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException if payment amount or currency does not match order", async () => {
      const order = createMockOrder();
      order.payments[0].amount = 999; // mismatch

      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 10,
        lines: [{ orderItemId: 101, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException if committed refund without lines exists", async () => {
      const order = createMockOrder();
      const unallocatedOp = new RefundOperation();
      unallocatedOp.status = RefundStatus.SUCCEEDED;
      unallocatedOp.refundLines = [];
      order.refundOperations = [unallocatedOp];

      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 10,
        lines: [{ orderItemId: 101, quantity: 1, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });

    it("throws BadRequestException on duplicate refund lines", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        lines: [
          { orderItemId: 101, quantity: 1, amount: 10 },
          { orderItemId: 101, quantity: 1, amount: 10 },
        ],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException if refund line quantity or amount exceeds line balance", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        lines: [{ orderItemId: 101, quantity: 99, amount: 10 }],
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException if staff auto-allocation amount exceeds order balance", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const dto: CreateRefundDto = {
        amount: 1000, // exceeds 55 EUR
      };

      await expect(
        service.createRefund(42, dto, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it("successfully creates a refund reservation and delegates to executeRefund", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const createdOp = new RefundOperation();
      createdOp.id = "op-created-1";
      createdOp.amount = 25;
      createdOp.status = RefundStatus.PENDING;
      mockEntityManager.save.mockResolvedValue(createdOp);

      const executeSpy = jest
        .spyOn(service, "executeRefund")
        .mockResolvedValue(createdOp);

      const dto: CreateRefundDto = {
        amount: 25,
        reason: "Customer request",
        lines: [{ orderItemId: 101, quantity: 1, amount: 25 }],
      };

      const result = await service.createRefund(42, dto, mockSellerUser);
      expect(result).toBe(createdOp);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "refund.reserved",
          targetType: "order",
          targetId: "42",
        }),
        mockEntityManager,
      );
      expect(executeSpy).toHaveBeenCalledWith(expect.any(String));
    });

    it("successfully performs staff order-wide allocation without lines", async () => {
      const order = createMockOrder();
      mockEntityManager.findOne.mockResolvedValueOnce(order);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order);

      const createdOp = new RefundOperation();
      createdOp.id = "op-auto-1";
      createdOp.amount = 30;
      createdOp.status = RefundStatus.PENDING;
      mockEntityManager.save.mockResolvedValue(createdOp);

      jest.spyOn(service, "executeRefund").mockResolvedValue(createdOp);

      const dto: CreateRefundDto = {
        amount: 30,
        reason: "Staff goodwill refund",
      };

      const result = await service.createRefund(42, dto, mockAdminUser);
      expect(result).toBe(createdOp);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        RefundLine,
        expect.any(Object),
      );
    });
  });

  describe("executeRefund", () => {
    it("returns immediately if operation is already SUCCEEDED or FAILED", async () => {
      const existingOp = new RefundOperation();
      existingOp.id = "op-done";
      existingOp.status = RefundStatus.SUCCEEDED;

      mockEntityManager.findOneOrFail.mockResolvedValueOnce(existingOp);

      const result = await service.executeRefund("op-done");
      expect(result).toBe(existingOp);
      expect(stripeService.createRefund).not.toHaveBeenCalled();
    });

    it("throws ConflictException if paymentIntentId is missing", async () => {
      const pendingOp = new RefundOperation();
      pendingOp.id = "op-no-intent";
      pendingOp.status = RefundStatus.PENDING;
      pendingOp.paymentIntentId = undefined as any;

      mockEntityManager.findOneOrFail.mockResolvedValueOnce(pendingOp);

      await expect(service.executeRefund("op-no-intent")).rejects.toThrow(
        ConflictException,
      );
    });

    it("throws ConflictException if provider idempotency window (>23 hours) has elapsed", async () => {
      const pendingOp = new RefundOperation();
      pendingOp.id = "op-expired";
      pendingOp.status = RefundStatus.PENDING;
      pendingOp.paymentIntentId = "pi_123456";
      pendingOp.providerAttemptedAt = new Date(Date.now() - 25 * 3600000);

      mockEntityManager.findOneOrFail.mockResolvedValueOnce(pendingOp);
      stripeService.findRefundForOperation.mockResolvedValueOnce(undefined);

      await expect(service.executeRefund("op-expired")).rejects.toThrow(
        ConflictException,
      );
      expect(mockRefundOpRepo.update).toHaveBeenCalledWith(
        { id: "op-expired", status: RefundStatus.PENDING },
        expect.objectContaining({
          failureReason: expect.stringContaining("elapsed"),
        }),
      );
    });

    it("retrieves remote refund and calls applyProviderRefund when provider refund already exists", async () => {
      const pendingOp = new RefundOperation();
      pendingOp.id = "op-exists";
      pendingOp.status = RefundStatus.PENDING;
      pendingOp.paymentIntentId = "pi_123456";
      pendingOp.providerRefundId = "re_remote_999";
      pendingOp.currency = Currency.EUR;
      pendingOp.amount = 20;

      const remoteRefund = {
        id: "re_remote_999",
        payment_intent: "pi_123456",
        amount: 2000,
        currency: "eur",
        status: "succeeded",
      } as unknown as Stripe.Refund;

      mockEntityManager.findOneOrFail.mockResolvedValueOnce(pendingOp);
      stripeService.retrieveRefund.mockResolvedValueOnce(remoteRefund);

      const applySpy = jest
        .spyOn(service as any, "applyProviderRefund")
        .mockResolvedValue(pendingOp);

      const result = await service.executeRefund("op-exists");
      expect(result).toBe(pendingOp);
      expect(applySpy).toHaveBeenCalledWith("pi_123456", remoteRefund);
      expect(stripeService.createRefund).not.toHaveBeenCalled();
    });

    it("creates refund on Stripe when no remote refund exists and applies outcome", async () => {
      const pendingOp = new RefundOperation();
      pendingOp.id = "op-create-remote";
      pendingOp.status = RefundStatus.PENDING;
      pendingOp.paymentIntentId = "pi_123456";
      pendingOp.currency = Currency.EUR;
      pendingOp.amount = 25;

      const createdRemoteRefund = {
        id: "re_new_111",
        payment_intent: "pi_123456",
        amount: 2500,
        currency: "eur",
        status: "succeeded",
      } as unknown as Stripe.Refund;

      mockEntityManager.findOneOrFail.mockResolvedValueOnce(pendingOp);
      stripeService.findRefundForOperation.mockResolvedValueOnce(undefined);
      stripeService.createRefund.mockResolvedValueOnce(createdRemoteRefund);

      const applySpy = jest
        .spyOn(service as any, "applyProviderRefund")
        .mockResolvedValue(pendingOp);

      const result = await service.executeRefund("op-create-remote");
      expect(result).toBe(pendingOp);
      expect(stripeService.createRefund).toHaveBeenCalledWith(
        "pi_123456",
        2500,
        "requested_by_customer",
        "refund-op-create-remote",
        "op-create-remote",
      );
      expect(applySpy).toHaveBeenCalledWith("pi_123456", createdRemoteRefund);
    });

    it("records failure reason and throws ServiceUnavailableException on Stripe network failure", async () => {
      const pendingOp = new RefundOperation();
      pendingOp.id = "op-fail";
      pendingOp.status = RefundStatus.PENDING;
      pendingOp.paymentIntentId = "pi_123456";
      pendingOp.currency = Currency.EUR;
      pendingOp.amount = 10;

      mockEntityManager.findOneOrFail.mockResolvedValueOnce(pendingOp);
      stripeService.findRefundForOperation.mockResolvedValueOnce(undefined);
      stripeService.createRefund.mockRejectedValueOnce(
        new Error("Stripe network timeout"),
      );

      await expect(service.executeRefund("op-fail")).rejects.toThrow(
        ServiceUnavailableException,
      );

      expect(mockRefundOpRepo.update).toHaveBeenCalledWith(
        { id: "op-fail", status: RefundStatus.PENDING },
        { failureReason: "Stripe network timeout" },
      );
    });
  });

  describe("reconcilePaymentRefunds", () => {
    it("fetches refunds for payment intent and applies each", async () => {
      const refund1 = { id: "re_1", payment_intent: "pi_123" } as Stripe.Refund;
      const refund2 = { id: "re_2", payment_intent: "pi_123" } as Stripe.Refund;

      stripeService.listRefunds.mockResolvedValueOnce([refund1, refund2]);
      const applySpy = jest
        .spyOn(service as any, "applyProviderRefund")
        .mockResolvedValue({} as RefundOperation);

      await service.reconcilePaymentRefunds("pi_123");
      expect(stripeService.listRefunds).toHaveBeenCalledWith("pi_123");
      expect(applySpy).toHaveBeenCalledTimes(2);
      expect(applySpy).toHaveBeenNthCalledWith(1, "pi_123", refund1);
      expect(applySpy).toHaveBeenNthCalledWith(2, "pi_123", refund2);
    });
  });

  describe("applyProviderRefund (internal)", () => {
    it("throws NotFoundException if payment is not recorded", async () => {
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);

      const remote = { id: "re_unknown" } as Stripe.Refund;
      await expect(
        (service as any).applyProviderRefund("pi_not_found", remote),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException on currency or payment intent mismatch", async () => {
      const order = createMockOrder();
      const payment = order.payments[0];
      mockPaymentRepo.findOne.mockResolvedValueOnce(payment);
      mockEntityManager.findOneOrFail.mockResolvedValueOnce(order); // order lock

      const remote = {
        id: "re_mismatch",
        payment_intent: "pi_DIFFERENT",
        currency: "usd",
        amount: 2500,
      } as Stripe.Refund;

      stripeService.retrieveRefund.mockResolvedValueOnce(remote);

      await expect(
        (service as any).applyProviderRefund(payment.transactionId, remote),
      ).rejects.toThrow(ConflictException);
    });

    it("successfully reconciles a succeeded partial refund and emits outbox and audit events", async () => {
      const order = createMockOrder();
      const payment = order.payments[0];
      mockPaymentRepo.findOne.mockResolvedValueOnce(payment);

      const remote = {
        id: "re_succeeded_part",
        payment_intent: payment.transactionId,
        currency: "eur",
        amount: 2000,
        status: "succeeded",
        metadata: { operationId: "op-part-1" },
      } as unknown as Stripe.Refund;

      const existingOp = new RefundOperation();
      existingOp.id = "op-part-1";
      existingOp.order = order;
      existingOp.amount = 20;
      existingOp.currency = Currency.EUR;
      existingOp.status = RefundStatus.PENDING;

      stripeService.retrieveRefund.mockResolvedValueOnce(remote);
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(order) // lock order
        .mockResolvedValueOnce(order); // order with buyer & orderItems
      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // lookup by providerRefundId
        .mockResolvedValueOnce(existingOp); // lookup by metadata.operationId
      mockEntityManager.find.mockResolvedValueOnce([existingOp]); // refunds for order

      const result = await (service as any).applyProviderRefund(
        payment.transactionId,
        remote,
      );

      expect(result.status).toBe(RefundStatus.SUCCEEDED);
      expect(result.providerRefundId).toBe("re_succeeded_part");
      expect(outboxService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "order.refund_created",
          aggregateType: "order",
          aggregateId: "42",
        }),
        mockEntityManager,
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "refund.reconciled",
          targetType: "order",
          targetId: "42",
        }),
        mockEntityManager,
      );
    });

    it("updates order and payment status to REFUNDED when full order amount is refunded", async () => {
      const order = createMockOrder({ totalAmount: 50 });
      const payment = order.payments[0];
      payment.amount = 50;
      mockPaymentRepo.findOne.mockResolvedValueOnce(payment);

      const remote = {
        id: "re_full",
        payment_intent: payment.transactionId,
        currency: "eur",
        amount: 5000,
        status: "succeeded",
        metadata: { operationId: "op-full" },
      } as unknown as Stripe.Refund;

      const existingOp = new RefundOperation();
      existingOp.id = "op-full";
      existingOp.order = order;
      existingOp.amount = 50;
      existingOp.currency = Currency.EUR;
      existingOp.status = RefundStatus.PENDING;

      stripeService.retrieveRefund.mockResolvedValueOnce(remote);
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order);
      mockEntityManager.findOne.mockResolvedValueOnce(existingOp); // by providerRefundId
      mockEntityManager.find.mockResolvedValueOnce([
        { ...existingOp, status: RefundStatus.SUCCEEDED },
      ]);

      const result = await (service as any).applyProviderRefund(
        payment.transactionId,
        remote,
      );

      expect(result.status).toBe(RefundStatus.SUCCEEDED);
      expect(order.status).toBe(OrderStatus.REFUNDED);
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        PaymentTransaction,
        { id: payment.id },
        { status: PaymentStatus.REFUNDED },
      );
    });

    it("reverses a previously full-refunded order back to original status if refund failed", async () => {
      const order = createMockOrder({
        totalAmount: 50,
        status: OrderStatus.REFUNDED,
      });
      const payment = order.payments[0];
      payment.status = PaymentStatus.REFUNDED;
      mockPaymentRepo.findOne.mockResolvedValueOnce(payment);

      const remote = {
        id: "re_failed_reversal",
        payment_intent: payment.transactionId,
        currency: "eur",
        amount: 5000,
        status: "failed",
        failure_reason: "insufficient_funds",
        metadata: { operationId: "op-failed" },
      } as unknown as Stripe.Refund;

      const existingOp = new RefundOperation();
      existingOp.id = "op-failed";
      existingOp.order = order;
      existingOp.amount = 50;
      existingOp.currency = Currency.EUR;
      existingOp.status = RefundStatus.SUCCEEDED; // was previously succeeded!
      existingOp.orderStatusBeforeFullRefund = OrderStatus.DELIVERED;

      stripeService.retrieveRefund.mockResolvedValueOnce(remote);
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order);
      mockEntityManager.findOne.mockResolvedValueOnce(existingOp);
      mockEntityManager.find.mockResolvedValueOnce([existingOp]);

      const result = await (service as any).applyProviderRefund(
        payment.transactionId,
        remote,
      );

      expect(result.status).toBe(RefundStatus.FAILED);
      expect(order.status).toBe(OrderStatus.DELIVERED);
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        PaymentTransaction,
        { id: payment.id },
        { status: PaymentStatus.COMPLETED },
      );
    });
  });
});
