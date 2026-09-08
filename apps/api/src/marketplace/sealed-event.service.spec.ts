import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { Repository } from "typeorm";
import { CreateSealedEventDto } from "./dto/sealed-event.dto";
import { SealedEvent, SealedEventType } from "./entities/sealed-event.entity";
import { SealedEventService } from "./sealed-event.service";

describe("SealedEventService", () => {
  let service: SealedEventService;
  let eventRepo: jest.Mocked<Repository<SealedEvent>>;
  let productRepo: jest.Mocked<Repository<SealedProduct>>;

  const mockEventRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProductRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SealedEventService,
        {
          provide: getRepositoryToken(SealedEvent),
          useValue: mockEventRepo,
        },
        {
          provide: getRepositoryToken(SealedProduct),
          useValue: mockProductRepo,
        },
      ],
    }).compile();

    service = module.get<SealedEventService>(SealedEventService);
    eventRepo = module.get(getRepositoryToken(SealedEvent));
    productRepo = module.get(getRepositoryToken(SealedProduct));
  });

  describe("recordEvent", () => {
    it("should throw NotFoundException if sealed product does not exist", async () => {
      productRepo.findOne.mockResolvedValue(null);

      const dto: CreateSealedEventDto = {
        sealedProductId: "prod-999",
        eventType: SealedEventType.VIEW,
      };

      await expect(service.recordEvent(dto)).rejects.toThrow(NotFoundException);
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: "prod-999" },
        select: ["id"],
      });
      expect(eventRepo.create).not.toHaveBeenCalled();
    });

    it("should hash client IP and record the event for authenticated user", async () => {
      productRepo.findOne.mockResolvedValue({
        id: "prod-5",
      } as unknown as SealedProduct);
      const mockEvent = { id: 1 } as any;
      eventRepo.create.mockReturnValue(mockEvent);
      eventRepo.save.mockResolvedValue(mockEvent);

      const dto: CreateSealedEventDto = {
        sealedProductId: "prod-5",
        eventType: SealedEventType.ADD_TO_CART,
        sessionId: "sess-123",
        context: { referrer: "details-page", listingId: 10 },
      };

      await service.recordEvent(
        dto,
        42,
        "192.168.1.1",
        "Mozilla/5.0 Test",
        "sess-override",
      );

      const expectedHashedIp = createHash("sha256")
        .update("192.168.1.1")
        .digest("hex")
        .substring(0, 16);

      expect(eventRepo.create).toHaveBeenCalledWith({
        sealedProduct: { id: "prod-5" },
        eventType: SealedEventType.ADD_TO_CART,
        user: { id: 42 },
        sessionId: "sess-override",
        ipAddress: expectedHashedIp,
        userAgent: "Mozilla/5.0 Test",
        context: { referrer: "details-page", listingId: 10 },
      });
      expect(eventRepo.save).toHaveBeenCalledWith(mockEvent);
    });

    it("should record event without user or IP address", async () => {
      productRepo.findOne.mockResolvedValue({
        id: "prod-10",
      } as unknown as SealedProduct);
      const mockEvent = { id: 2 } as any;
      eventRepo.create.mockReturnValue(mockEvent);
      eventRepo.save.mockResolvedValue(mockEvent);

      const dto: CreateSealedEventDto = {
        sealedProductId: "prod-10",
        eventType: SealedEventType.VIEW,
        sessionId: "anon-session",
      };

      await service.recordEvent(dto);

      expect(eventRepo.create).toHaveBeenCalledWith({
        sealedProduct: { id: "prod-10" },
        eventType: SealedEventType.VIEW,
        user: undefined,
        sessionId: "anon-session",
        ipAddress: undefined,
        userAgent: undefined,
        context: undefined,
      });
      expect(eventRepo.save).toHaveBeenCalledWith(mockEvent);
    });
  });
});
