import { Test, TestingModule } from "@nestjs/testing";
import { OutboxScheduler } from "./outbox.scheduler";
import { OutboxService } from "./outbox.service";

describe("OutboxScheduler", () => {
  let scheduler: OutboxScheduler;
  const outboxService = {
    processPendingEvents: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxScheduler,
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    scheduler = module.get<OutboxScheduler>(OutboxScheduler);
  });

  it("calls processPendingEvents on outbox service", async () => {
    outboxService.processPendingEvents.mockResolvedValue({
      processed: 2,
      failed: 0,
    });

    await scheduler.handleOutboxDispatch();

    expect(outboxService.processPendingEvents).toHaveBeenCalledWith(50);
  });
});
