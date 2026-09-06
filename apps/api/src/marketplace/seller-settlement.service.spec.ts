import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { Currency } from "../common/enums/currency";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import {
  PayoutMethod,
  PayoutStatus,
  SellerAccountStatus,
  SellerAllocationStatus,
} from "../common/enums/seller-settlement";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { SellerAllocation } from "./entities/seller-allocation.entity";
import { SellerPayout } from "./entities/seller-payout.entity";
import { SellerSettlementAccount } from "./entities/seller-settlement-account.entity";
import { SellerSettlementService } from "./seller-settlement.service";

describe("SellerSettlementService", () => {
  let service: SellerSettlementService;
  let accountRepo: Partial<Record<keyof Repository<SellerSettlementAccount>, jest.Mock>>;
  let allocationRepo: Partial<Record<keyof Repository<SellerAllocation>, jest.Mock>>;
  let payoutRepo: Partial<Record<keyof Repository<SellerPayout>, jest.Mock>>;
  let orderRepo: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let orderItemRepo: Partial<Record<keyof Repository<OrderItem>, jest.Mock>>;
  let userRepo: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let auditService: Partial<Record<keyof AuditService, jest.Mock>>;

  const mockSeller = {
    id: 10,
    email: "seller@test.com",
    role: UserRole.USER,
  } as User;

  const mockAdmin = {
    id: 1,
    email: "admin@test.com",
    role: UserRole.ADMIN,
  } as User;

  const mockAccount = (overrides: Partial<SellerSettlementAccount> = {}): SellerSettlementAccount =>
    ({
      id: 100,
      seller: mockSeller,
      status: SellerAccountStatus.ACTIVE,
      currency: Currency.EUR,
      balanceAvailable: 200,
      balancePending: 50,
      balanceOnHold: 0,
      balancePaidOut: 0,
      minimumPayoutAmount: 10,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
      payoutDetails: { ibanMasked: "FR76****7890" },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as SellerSettlementAccount;

  beforeEach(async () => {
    accountRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 100 })),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    allocationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 500 })),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    payoutRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 900 })),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    orderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    orderItemRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerSettlementService,
        {
          provide: getRepositoryToken(SellerSettlementAccount),
          useValue: accountRepo,
        },
        {
          provide: getRepositoryToken(SellerAllocation),
          useValue: allocationRepo,
        },
        {
          provide: getRepositoryToken(SellerPayout),
          useValue: payoutRepo,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<SellerSettlementService>(SellerSettlementService);
  });

  describe("getOrCreateAccount", () => {
    it("returns existing account if found", async () => {
      const existing = mockAccount();
      accountRepo.findOne!.mockResolvedValue(existing);

      const result = await service.getOrCreateAccount(mockSeller.id);
      expect(result).toBe(existing);
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it("creates and saves new account if not found", async () => {
      accountRepo.findOne!.mockResolvedValue(null);
      userRepo.findOne!.mockResolvedValue(mockSeller);

      const result = await service.getOrCreateAccount(mockSeller.id);
      expect(result).toBeDefined();
      expect(accountRepo.create).toHaveBeenCalled();
      expect(accountRepo.save).toHaveBeenCalled();
    });
  });

  describe("createAllocationsForOrder", () => {
    it("creates pending allocations and updates seller pending balance", async () => {
      const order = {
        id: 42,
        currency: Currency.EUR,
      } as Order;

      const orderItem = {
        id: 1,
        seller: mockSeller,
        order,
        unitPrice: 100,
        quantity: 1,
        shippingCost: 0,
      } as unknown as OrderItem;

      orderItemRepo.find!.mockResolvedValue([orderItem]);
      const account = mockAccount({ balancePending: 0 });
      accountRepo.findOne!.mockResolvedValue(account);

      const allocations = await service.createAllocationsForOrder(order);

      expect(allocations).toHaveLength(1);
      expect(allocations[0].grossAmount).toBe(100);
      expect(allocations[0].commissionRate).toBe(0.05);
      expect(allocations[0].commissionAmount).toBe(5);
      expect(allocations[0].netAmount).toBe(95);
      expect(allocations[0].status).toBe(SellerAllocationStatus.PENDING_DELIVERY);
      expect(account.balancePending).toBe(95);
      expect(accountRepo.save).toHaveBeenCalledWith(account);
    });
  });

  describe("onItemDelivered", () => {
    it("releases pending allocation to available balance when all items are delivered", async () => {
      const account = mockAccount({ balancePending: 95, balanceAvailable: 0 });
      const order = { id: 42 } as Order;
      const orderItem = {
        id: 1,
        order,
        seller: mockSeller,
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
      } as OrderItem;

      const allocation = {
        id: 501,
        seller: mockSeller,
        status: SellerAllocationStatus.PENDING_DELIVERY,
        netAmount: 95,
        currency: Currency.EUR,
      } as SellerAllocation;

      allocationRepo.findOne!.mockResolvedValue(allocation);
      orderItemRepo.find!.mockResolvedValue([orderItem]);
      accountRepo.findOne!.mockResolvedValue(account);

      await service.onItemDelivered(orderItem);

      expect(allocation.status).toBe(SellerAllocationStatus.AVAILABLE);
      expect(account.balancePending).toBe(0);
      expect(account.balanceAvailable).toBe(95);
      expect(allocationRepo.save).toHaveBeenCalledWith(allocation);
      expect(accountRepo.save).toHaveBeenCalledWith(account);
    });
  });

  describe("onClaimOpened", () => {
    it("holds allocation in balanceOnHold", async () => {
      const account = mockAccount({ balancePending: 95, balanceOnHold: 0 });
      const allocation = {
        id: 501,
        seller: mockSeller,
        currency: Currency.EUR,
        status: SellerAllocationStatus.PENDING_DELIVERY,
        netAmount: 95,
      } as SellerAllocation;

      allocationRepo.findOne!.mockResolvedValue(allocation);
      accountRepo.findOne!.mockResolvedValue(account);

      await service.onClaimOpened(42, mockSeller.id);

      expect(allocation.status).toBe(SellerAllocationStatus.DISPUTED_HOLD);
      expect(account.balancePending).toBe(0);
      expect(account.balanceOnHold).toBe(95);
    });
  });

  describe("requestPayout", () => {
    it("throws BadRequestException if amount exceeds available balance", async () => {
      const account = mockAccount({ balanceAvailable: 30 });
      accountRepo.findOne!.mockResolvedValue(account);

      await expect(
        service.requestPayout(mockSeller, { amount: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates requested payout and reserves available balance", async () => {
      const account = mockAccount({ balanceAvailable: 100 });
      accountRepo.findOne!.mockResolvedValue(account);

      const payout = await service.requestPayout(mockSeller, { amount: 50 });

      expect(payout.status).toBe(PayoutStatus.REQUESTED);
      expect(payout.amount).toBe(50);
      expect(account.balanceAvailable).toBe(50);
      expect(payoutRepo.save).toHaveBeenCalled();
      expect(accountRepo.save).toHaveBeenCalledWith(account);
    });
  });

  describe("adminProcessPayout", () => {
    it("marks payout complete and updates paid out balance", async () => {
      const payout = {
        id: 901,
        amount: 50,
        currency: Currency.EUR,
        status: PayoutStatus.PROCESSING,
        seller: mockSeller,
      } as SellerPayout;

      payoutRepo.findOne!.mockResolvedValue(payout);
      const account = mockAccount({ balancePaidOut: 0 });
      accountRepo.findOne!.mockResolvedValue(account);

      const processed = await service.adminProcessPayout(901, mockAdmin, {
        action: "COMPLETE",
        transactionReference: "WIRE-REF-9988",
      });

      expect(processed.status).toBe(PayoutStatus.COMPLETED);
      expect(account.balancePaidOut).toBe(50);
      expect(auditService.record).toHaveBeenCalled();
    });

    it("restores available balance if payout fails", async () => {
      const payout = {
        id: 901,
        amount: 50,
        currency: Currency.EUR,
        status: PayoutStatus.PROCESSING,
        seller: mockSeller,
      } as SellerPayout;

      payoutRepo.findOne!.mockResolvedValue(payout);
      const account = mockAccount({ balanceAvailable: 50 });
      accountRepo.findOne!.mockResolvedValue(account);

      const processed = await service.adminProcessPayout(901, mockAdmin, {
        action: "FAIL",
        failureReason: "Invalid IBAN format",
      });

      expect(processed.status).toBe(PayoutStatus.FAILED);
      expect(account.balanceAvailable).toBe(100);
      expect(accountRepo.save).toHaveBeenCalledWith(account);
    });
  });
});
