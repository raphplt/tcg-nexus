import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { SellerReview } from "./entities/seller-review.entity";
import { SellerReviewService } from "./seller-review.service";

describe("SellerReviewService", () => {
  let service: SellerReviewService;
  let reviewRepo: Partial<Record<keyof Repository<SellerReview>, jest.Mock>>;
  let orderRepo: Partial<Record<keyof Repository<Order>, jest.Mock>>;
  let orderItemRepo: Partial<Record<keyof Repository<OrderItem>, jest.Mock>>;
  let userRepo: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let auditService: Partial<Record<keyof AuditService, jest.Mock>>;

  const mockBuyer = {
    id: 10,
    email: "buyer@test.com",
    role: UserRole.USER,
  } as User;

  const mockSeller = {
    id: 20,
    email: "seller@test.com",
    role: UserRole.USER,
  } as User;

  const mockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem =>
    ({
      id: 101,
      order: { id: 42, buyer: mockBuyer } as Order,
      seller: mockSeller,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      ...overrides,
    }) as OrderItem;

  beforeEach(async () => {
    reviewRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 801 })),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    orderRepo = {
      findOne: jest.fn(),
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
        SellerReviewService,
        {
          provide: getRepositoryToken(SellerReview),
          useValue: reviewRepo,
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

    service = module.get<SellerReviewService>(SellerReviewService);
  });

  describe("createReview", () => {
    it("throws NotFoundException if orderItem not found", async () => {
      orderItemRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.createReview(42, 101, mockBuyer, { rating: 5, comment: "Parfait" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if user is not the order buyer", async () => {
      orderItemRepo.findOne!.mockResolvedValue(mockOrderItem());
      const intruder = { id: 99 } as User;

      await expect(
        service.createReview(42, 101, intruder, { rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException if orderItem is not DELIVERED", async () => {
      orderItemRepo.findOne!.mockResolvedValue(
        mockOrderItem({ fulfillmentStatus: FulfillmentStatus.SHIPPED }),
      );

      await expect(
        service.createReview(42, 101, mockBuyer, { rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws ConflictException if review already exists for item", async () => {
      orderItemRepo.findOne!.mockResolvedValue(mockOrderItem());
      reviewRepo.findOne!.mockResolvedValue({ id: 800 });

      await expect(
        service.createReview(42, 101, mockBuyer, { rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates verified review and records audit", async () => {
      orderItemRepo.findOne!.mockResolvedValue(mockOrderItem());
      reviewRepo.findOne!.mockResolvedValue(null);

      const review = await service.createReview(42, 101, mockBuyer, {
        rating: 5,
        comment: "Excellent état !",
      });

      expect(review.rating).toBe(5);
      expect(review.verifiedPurchase).toBe(true);
      expect(reviewRepo.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalled();
    });
  });

  describe("getSellerProfile", () => {
    it("returns calculated metrics, ratings, and sales count", async () => {
      userRepo.findOne!.mockResolvedValue(mockSeller);
      orderItemRepo.find!.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      reviewRepo.find!.mockResolvedValue([
        { id: 801, rating: 5, createdAt: new Date() },
        { id: 802, rating: 4, createdAt: new Date() },
      ]);

      const profile = await service.getSellerProfile(mockSeller.id);

      expect(profile.sellerId).toBe(mockSeller.id);
      expect(profile.completedSalesCount).toBe(2);
      expect(profile.totalReviewsCount).toBe(2);
      expect(profile.averageRating).toBe(4.5);
    });
  });
});
