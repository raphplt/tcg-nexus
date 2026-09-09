import { Injectable, Logger, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  In,
  LessThanOrEqual,
  Repository,
} from "typeorm";
import {
  DomainEventPayloads,
  DomainEventType,
} from "../common/events/domain-events";
import { runWithPostgresAdvisoryLock } from "../common/postgres-advisory-lock";
import { OutboxEvent, OutboxEventStatus } from "./entities/outbox-event.entity";

/** Lock shared by every dispatcher so one event is never delivered twice at once. */
const DISPATCH_LOCK = "tcg-nexus:outbox-dispatcher";

/**
 * Parameters for staging an event in the transactional outbox.
 *
 * The event name and its payload come from the shared contract, so a producer
 * cannot publish a name no consumer knows or omit a field one reads.
 */
export interface RecordOutboxParams<
  T extends DomainEventType = DomainEventType,
> {
  eventType: T;
  aggregateType: string;
  aggregateId: string;
  payload: DomainEventPayloads[T];
}

/**
 * Service orchestrating durable outbox records and at-least-once domain event dispatch.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private static readonly MAX_RETRIES = 5;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Records a domain event inside the transactional boundary.
   *
   * @param params - Outbox event attributes.
   * @param manager - Optional active database transaction manager.
   * @returns Created OutboxEvent entity.
   */
  async record<T extends DomainEventType>(
    params: RecordOutboxParams<T>,
    manager?: EntityManager,
  ): Promise<OutboxEvent> {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const event = repo.create({
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      payload: params.payload as Record<string, unknown>,
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      lastError: null,
      processedAt: null,
    });

    try {
      return await repo.save(event);
    } catch (err) {
      this.logger.error(
        `Failed to persist outbox event ${params.eventType} for ${params.aggregateType}#${params.aggregateId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Dispatches pending outbox events asynchronously.
   *
   * @param limit - Maximum number of pending events to process in one sweep.
   * @returns Processing summary with processed and failed counts.
   */
  async processPendingEvents(
    limit = 50,
  ): Promise<{ processed: number; failed: number }> {
    // Administrative replays and the scheduler share this lock, so a manual
    // retry cannot dispatch an event the sweep is already delivering.
    const result = await runWithPostgresAdvisoryLock(
      this.dataSource,
      DISPATCH_LOCK,
      () => this.dispatchPendingEvents(limit),
    );
    return result ?? { processed: 0, failed: 0 };
  }

  private async dispatchPendingEvents(
    limit: number,
  ): Promise<{ processed: number; failed: number }> {
    const pending = await this.outboxRepository.find({
      where: {
        status: In([OutboxEventStatus.PENDING, OutboxEventStatus.FAILED]),
        retryCount: LessThanOrEqual(OutboxService.MAX_RETRIES),
      },
      order: { createdAt: "ASC" },
      take: limit,
    });

    let processed = 0;
    let failed = 0;

    for (const event of pending) {
      try {
        // An event nobody consumes is a broken contract, not a delivery: marking
        // it processed would hide the mismatch this check surfaces.
        if (this.eventEmitter.listeners(event.eventType).length === 0) {
          throw new Error(
            `No consumer registered for event ${event.eventType}`,
          );
        }

        await this.eventEmitter.emitAsync(event.eventType, {
          eventId: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          ...event.payload,
        });

        event.status = OutboxEventStatus.PROCESSED;
        event.processedAt = new Date();
        event.lastError = null;
        await this.outboxRepository.save(event);
        processed++;
      } catch (err) {
        failed++;
        event.retryCount += 1;
        event.lastError = (err as Error).message;
        if (event.retryCount > OutboxService.MAX_RETRIES) {
          event.status = OutboxEventStatus.FAILED;
        }
        await this.outboxRepository.save(event);
        this.logger.warn(
          `Failed dispatching outbox event ${event.id} (${event.eventType}): ${(err as Error).message}`,
        );
      }
    }

    return { processed, failed };
  }
}
