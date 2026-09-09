import { Injectable, Logger } from "@nestjs/common";
import { DataSource, QueryFailedError } from "typeorm";
import { ProcessedEvent } from "./entities/processed-event.entity";

/**
 * Runs event consumers at most once per delivered event (FND-03).
 *
 * The claim row and the consumer's work commit together, so a failure rolls the
 * claim back and the next dispatch retries it, while a redelivery of work that
 * already succeeded is skipped. Work writing outside this transaction — an
 * outbound email, for instance — is still only best-effort deduplicated: it is
 * the reason each consumer keeps its own claim rather than sharing one.
 */
@Injectable()
export class EventConsumerService {
  private readonly logger = new Logger(EventConsumerService.name);

  constructor(private readonly database: DataSource) {}

  /**
   * Executes a consumer's work unless this event was already handled by it.
   *
   * @param consumer - Stable consumer name, unique per side effect.
   * @param event - Delivered event identity and name.
   * @param work - Side effect to perform exactly once.
   * @returns True when the work ran, false when the event was already handled.
   * @throws Error Propagated from the work, so the dispatcher can retry it.
   */
  async runOnce(
    consumer: string,
    event: { eventId?: string; eventType: string },
    work: () => Promise<void>,
  ): Promise<boolean> {
    // An event delivered without a durable identity cannot be deduplicated;
    // running it is safer than dropping a notification entirely.
    if (!event.eventId) {
      await work();
      return true;
    }

    try {
      return await this.database.transaction(async (manager) => {
        const existing = await manager.findOne(ProcessedEvent, {
          where: { consumer, eventId: event.eventId },
        });
        if (existing) return false;

        await manager.save(
          ProcessedEvent,
          manager.create(ProcessedEvent, {
            consumer,
            eventId: event.eventId,
            eventType: event.eventType,
          }),
        );
        await work();
        return true;
      });
    } catch (error) {
      // A concurrent dispatcher claimed the same event first.
      if (
        error instanceof QueryFailedError &&
        String((error as { code?: string }).code) === "23505"
      ) {
        this.logger.debug(
          `Consumer ${consumer} skipped event ${event.eventId}: claimed concurrently`,
        );
        return false;
      }
      throw error;
    }
  }
}
