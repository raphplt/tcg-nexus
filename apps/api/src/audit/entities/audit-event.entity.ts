import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Append-only domain audit record capturing sensitive business mutations.
 */
@Entity("audit_event")
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "integer", nullable: true })
  actorId: number | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  actorRole: string | null;

  @Index()
  @Column({ type: "varchar", length: 64 })
  targetType: string;

  @Index()
  @Column({ type: "varchar", length: 128 })
  targetId: string;

  @Column({ type: "varchar", length: 64 })
  action: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  correlationId: string | null;

  @Column({ type: "jsonb", nullable: true })
  beforeState: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  afterState: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
