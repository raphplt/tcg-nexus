import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuditService } from "./audit.service";
import { AuditEvent } from "./entities/audit-event.entity";

describe("AuditService", () => {
  let service: AuditService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto: unknown) => dto as AuditEvent),
      save: jest.fn(async (event: unknown) => ({
        id: "audit-uuid-1",
        createdAt: new Date(),
        ...(event as object),
      } as AuditEvent)),
      find: jest.fn(async () => []),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it("should record an audit event using default repository", async () => {
    const result = await service.record({
      actorId: 42,
      actorRole: "buyer",
      targetType: "order",
      targetId: "100",
      action: "order.checkout_started",
      reason: "Initial reservation",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 42,
        actorRole: "buyer",
        targetType: "order",
        targetId: "100",
        action: "order.checkout_started",
        reason: "Initial reservation",
      }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(result.id).toBe("audit-uuid-1");
  });

  it("should record an audit event within a provided transaction manager", async () => {
    const managerRepo = {
      create: jest.fn((dto: unknown) => dto as AuditEvent),
      save: jest.fn(async (event: unknown) => ({
        id: "tx-audit-uuid",
        createdAt: new Date(),
        ...(event as object),
      } as AuditEvent)),
    };
    const mockManager: any = {
      getRepository: jest.fn().mockReturnValue(managerRepo),
    };

    const result = await service.record(
      {
        actorId: 1,
        targetType: "order",
        targetId: "200",
        action: "order.cancelled",
        reason: "Reservation expired",
      },
      mockManager,
    );

    expect(mockManager.getRepository).toHaveBeenCalledWith(AuditEvent);
    expect(managerRepo.create).toHaveBeenCalled();
    expect(managerRepo.save).toHaveBeenCalled();
    expect(result.id).toBe("tx-audit-uuid");
  });

  it("should retrieve timeline for target", async () => {
    const mockEvents = [
      { id: "1", targetType: "order", targetId: "10", action: "order.created" },
    ] as AuditEvent[];
    repo.find.mockResolvedValue(mockEvents);

    const timeline = await service.findTimeline("order", "10");
    expect(repo.find).toHaveBeenCalledWith({
      where: { targetType: "order", targetId: "10" },
      order: { createdAt: "ASC" },
    });
    expect(timeline).toEqual(mockEvents);
  });
});
