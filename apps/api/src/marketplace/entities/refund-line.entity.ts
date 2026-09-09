import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { OrderItem } from "./order-item.entity";
import { RefundOperation } from "./refund-operation.entity";

/**
 * Line item allocation for a partial or full refund operation.
 */
@Entity("refund_line")
export class RefundLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @ManyToOne(
    () => RefundOperation,
    (op) => op.refundLines,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "refund_operation_id" })
  refundOperation: RefundOperation;

  @Index()
  @ManyToOne(
    () => OrderItem,
    (item) => item.refundLines,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "order_item_id" })
  orderItem: OrderItem;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  shippingAmount: number;
}
