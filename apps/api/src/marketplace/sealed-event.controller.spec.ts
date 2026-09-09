import { Test, TestingModule } from "@nestjs/testing";
import { User } from "src/user/entities/user.entity";
import { SealedEventController } from "./sealed-event.controller";
import { SealedEventService } from "./sealed-event.service";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CreateSealedEventDto } from "./dto/sealed-event.dto";
import { SealedEventType } from "./entities/sealed-event.entity";

describe("SealedEventController", () => {
  let controller: SealedEventController;
  let service: jest.Mocked<SealedEventService>;

  const mockSealedEventService = {
    recordEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SealedEventController],
      providers: [
        {
          provide: SealedEventService,
          useValue: mockSealedEventService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<SealedEventController>(SealedEventController);
    service = module.get(SealedEventService);
  });

  describe("recordEvent", () => {
    it("should record event with user, ip and user-agent headers", async () => {
      const dto: CreateSealedEventDto = {
        sealedProductId: "prod-12",
        eventType: SealedEventType.VIEW,
        sessionId: "sess-abc",
      };
      const user = { id: 7 } as User;
      const req = { headers: { "user-agent": "Mozilla/5.0" } };

      const result = await controller.recordEvent(dto, user, "127.0.0.1", req);

      expect(service.recordEvent).toHaveBeenCalledWith(
        dto,
        7,
        "127.0.0.1",
        "Mozilla/5.0",
        "sess-abc",
      );
      expect(result).toEqual({ success: true });
    });

    it("should record event without authenticated user or request headers", async () => {
      const dto: CreateSealedEventDto = {
        sealedProductId: "prod-15",
        eventType: SealedEventType.FAVORITE,
      };

      const result = await controller.recordEvent(
        dto,
        undefined,
        undefined,
        undefined,
      );

      expect(service.recordEvent).toHaveBeenCalledWith(
        dto,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
