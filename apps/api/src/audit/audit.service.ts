import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AuditEvent } from "./entities/audit-event.entity";

/**
 * Parameters for recording an append-only domain audit record.
 */
export interface RecordAuditParams {
  actorId?: number | null;
  actorRole?: string | null;
  targetType: string;
  targetId: string;
  action: string;
  reason?: string | null;
  correlationId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

/**
 * Service responsible for recording and querying append-only business audit logs.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
  ) {}

  /**
   * Records a domain audit entry, optionally within an existing transaction manager.
   *
   * @param params - Audit entry details.
   * @param manager - Optional TypeORM transaction manager.
   * @returns The saved audit event entity.
   */
  async record(
    params: RecordAuditParams,
    manager?: EntityManager,
  ): Promise<AuditEvent> {
    const repo = manager
      ? manager.getRepository(AuditEvent)
      : this.auditRepository;

    const event = repo.create({
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? null,
      targetType: params.targetType,
      targetId: params.targetId,
      action: params.action,
      reason: params.reason ?? null,
      correlationId: params.correlationId ?? null,
      beforeState: params.beforeState ?? null,
      afterState: params.afterState ?? null,
    });

    try {
      return await repo.save(event);
    } catch (err) {
      this.logger.error(
        `Failed to record audit event for ${params.targetType}#${params.targetId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Retrieves chronological audit timeline for a specific target.
   *
   * @param targetType - Entity domain name (e.g., 'order').
   * @param targetId - Entity identifier.
   * @returns Chronological list of audit events.
   */
  async findTimeline(
    targetType: string,
    targetId: string,
  ): Promise<AuditEvent[]> {
    return this.auditRepository.find({
      where: {
        targetType,
        targetId,
      },
      order: {
        createdAt: "ASC",
      },
    });
  }
}
