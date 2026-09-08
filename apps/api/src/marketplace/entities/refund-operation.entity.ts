import { RefundStatus } from "src/common/enums/refund-status";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Order, OrderStatus } from "./order.entity";
import { RefundLine } from "./refund-line.entity";

/**
 * Persisted financial refund operation with provider reference and line-level allocations.
 */
@Entity("refund_operation")
@Index("IDX_refund_order_request_key", ["order", "requestKey"], {
  unique: true,
})
export class RefundOperation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @ManyToOne(
    () => Order,
    (order) => order.refundOperations,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 10, default: "EUR" })
  currency: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Index()
  @Column({ type: "varchar", length: 128, nullable: true })
  providerRefundId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  createdBy?: User | null;

  @OneToMany(
    () => RefundLine,
    (line) => line.refundOperation,
    {
      cascade: true,
    },
  )
  refundLines: RefundLine[];

  /** Stable order-scoped operation identity; null only for legacy/provider-originated rows. */
  @Column({ type: "varchar", length: 128, nullable: true })
  requestKey?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  fingerprint?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paymentIntentId?: string | null;

  /** Committed before the external call so a crash cannot erase an ambiguous attempt. */
  @Column({ type: "timestamptz", nullable: true })
  providerAttemptedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  failureReason?: string | null;

  /** Restores fulfillment state if a full refund is later rejected by the bank. */
  @Column({ type: "varchar", length: 32, nullable: true })
  orderStatusBeforeFullRefund?: OrderStatus | null;

  @CreateDateColumn()
  createdAt: Date;
}
