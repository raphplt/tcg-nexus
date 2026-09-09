import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OutboxEvent, OutboxEventStatus } from "./entities/outbox-event.entity";
import { OutboxService } from "./outbox.service";

describe("OutboxService", () => {
  let service: OutboxService;
  let repo: any;
  let eventEmitter: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto: unknown) => dto as OutboxEvent),
      save: jest.fn(
        async (event: unknown) =>
          ({
            id: "outbox-uuid-1",
            ...(event as object),
          }) as OutboxEvent,
      ),
      find: jest.fn(async () => []),
    };
    eventEmitter = {
      emitAsync: jest.fn(async () => []),
      listeners: jest.fn(() => [() => undefined]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: repo,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it("should stage an outbox event", async () => {
    const event = await service.record({
      eventType: "order.paid",
      aggregateType: "order",
      aggregateId: "123",
      payload: {
        orderId: 123,
        buyerId: 1,
        amount: 50,
        currency: "EUR",
      },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "order.paid",
        aggregateType: "order",
        aggregateId: "123",
        status: OutboxEventStatus.PENDING,
      }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(event.id).toBe("outbox-uuid-1");
  });

  it("should process pending events successfully", async () => {
    const pendingEvent = {
      id: "outbox-1",
      eventType: "order.paid",
      aggregateType: "order",
      aggregateId: "100",
      payload: { total: 100 },
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
    } as unknown as OutboxEvent;

    repo.find.mockResolvedValue([pendingEvent]);

    const result = await service.processPendingEvents();

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      "order.paid",
      expect.objectContaining({
        eventId: "outbox-1",
        aggregateId: "100",
        total: 100,
      }),
    );
    expect(pendingEvent.status).toBe(OutboxEventStatus.PROCESSED);
    expect(pendingEvent.processedAt).toBeDefined();
    expect(result).toEqual({ processed: 1, failed: 0 });
  });

  it("refuses to mark an event nobody consumes as processed", async () => {
    const orphan = {
      id: "outbox-orphan",
      eventType: "order.paid",
      aggregateType: "order",
      aggregateId: "100",
      payload: {},
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
    } as unknown as OutboxEvent;
    repo.find.mockResolvedValue([orphan]);
    eventEmitter.listeners.mockReturnValue([]);

    const result = await service.processPendingEvents();

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    expect(orphan.status).not.toBe(OutboxEventStatus.PROCESSED);
    expect(orphan.lastError).toContain("No consumer registered");
  });

  it("should track failed dispatch and increment retry count", async () => {
    const pendingEvent = {
      id: "outbox-2",
      eventType: "order.paid",
      aggregateType: "order",
      aggregateId: "100",
      payload: {},
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
    } as unknown as OutboxEvent;

    repo.find.mockResolvedValue([pendingEvent]);
    eventEmitter.emitAsync.mockRejectedValue(new Error("Delivery failed"));

    const result = await service.processPendingEvents();

    expect(pendingEvent.retryCount).toBe(1);
    expect(pendingEvent.lastError).toBe("Delivery failed");
    expect(result).toEqual({ processed: 0, failed: 1 });
  });
});
