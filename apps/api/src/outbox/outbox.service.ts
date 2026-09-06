import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, LessThanOrEqual, Repository } from "typeorm";
import { OutboxEvent, OutboxEventStatus } from "./entities/outbox-event.entity";

/**
 * Parameters for staging an event in the transactional outbox.
 */
export interface RecordOutboxParams {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
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
  ) {}

  /**
   * Records a domain event inside the transactional boundary.
   *
   * @param params - Outbox event attributes.
   * @param manager - Optional active database transaction manager.
   * @returns Created OutboxEvent entity.
   */
  async record(
    params: RecordOutboxParams,
    manager?: EntityManager,
  ): Promise<OutboxEvent> {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const event = repo.create({
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      payload: params.payload,
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
