import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Lifecycle state of a transactional outbox event.
 */
export enum OutboxEventStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  FAILED = "failed",
}

/**
 * Append-only transactional outbox record for reliable domain event dispatch.
 */
@Entity("outbox_event")
export class OutboxEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "varchar", length: 128 })
  eventType: string;

  @Column({ type: "varchar", length: 64 })
  aggregateType: string;

  @Index()
  @Column({ type: "varchar", length: 128 })
  aggregateId: string;

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>;

  @Index()
  @Column({
    type: "enum",
    enum: OutboxEventStatus,
    default: OutboxEventStatus.PENDING,
  })
  status: OutboxEventStatus;

  @Column({ type: "integer", default: 0 })
  retryCount: number;

  @Column({ type: "text", nullable: true })
  lastError: string | null;

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
