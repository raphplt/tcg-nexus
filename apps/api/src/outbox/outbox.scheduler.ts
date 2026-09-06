import { Injectable, Logger, Optional } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { DataSource } from "typeorm";
import { runWithPostgresAdvisoryLock } from "../common/postgres-advisory-lock";
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
    await runWithPostgresAdvisoryLock(
      this.dataSource,
      "tcg-nexus:outbox-dispatcher",
      async () => {
        const result = await this.outboxService.processPendingEvents(50);
        if (result.processed > 0 || result.failed > 0) {
          this.logger.log(
            `Outbox sweep completed: ${result.processed} processed, ${result.failed} failed.`,
          );
        }
      },
    );
  }
}
