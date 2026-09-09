import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

/**
 * Record that one consumer has handled one outbox event (FND-03).
 *
 * Dispatch is at least once: a redelivered event finds this row and is skipped,
 * so a retry after a partial failure does not duplicate a notification or an
 * email that already went out. Each consumer keeps its own row, so an email
 * consumer can still retry after the in-app notification succeeded.
 */
@Entity("processed_event")
@Unique(["consumer", "eventId"])
@Index(["eventId"])
export class ProcessedEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Stable name of the consumer that handled the event. */
  @Column({ type: "varchar", length: 128 })
  consumer: string;

  /** Identity of the outbox event that was handled. */
  @Column({ type: "varchar", length: 64 })
  eventId: string;

  /** Event name, kept for operational inspection of what a consumer saw. */
  @Column({ type: "varchar", length: 128 })
  eventType: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}
