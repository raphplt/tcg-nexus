import { Injectable, Logger, Optional } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { DataSource } from "typeorm";
import { OutboxService } from "./outbox.service";

/**
 * Background scheduler dispatching staged transactional outbox domain events.
 */
@Injectable()
export class OutboxScheduler {
  private readonly logger = new Logger(OutboxScheduler.name);

  constructor(
    private readonly outboxService: OutboxService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Sweeps pending outbox events across worker replicas using a PostgreSQL advisory lock.
   */
  @Interval(10000)
  async handleOutboxDispatch(): Promise<void> {
    // The dispatch lock lives in the service, so every caller — this sweep and
    // the administrative replay alike — is serialized by it.
    const result = await this.outboxService.processPendingEvents(50);
    if (result.processed > 0 || result.failed > 0) {
      this.logger.log(
        `Outbox sweep completed: ${result.processed} processed, ${result.failed} failed.`,
      );
    }
  }
}
