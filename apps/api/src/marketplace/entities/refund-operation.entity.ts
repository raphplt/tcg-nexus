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
import { Order } from "./order.entity";
import { RefundLine } from "./refund-line.entity";

/**
 * Persisted financial refund operation with provider reference and line-level allocations.
 */
@Entity("refund_operation")
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

  @CreateDateColumn()
  createdAt: Date;
}
