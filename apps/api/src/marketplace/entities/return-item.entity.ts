import { InventoryDisposition } from "src/common/enums/inventory-disposition";
import { ReturnStatus } from "src/common/enums/return-status";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { OrderItem } from "./order-item.entity";

/**
 * Physical return workflow entity decoupled from monetary refund.
 */
@Entity("return_item")
export class ReturnItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @ManyToOne(
    () => OrderItem,
    (item) => item.returnItems,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "order_item_id" })
  orderItem: OrderItem;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column({ type: "text" })
  reason: string;

  @Column({
    type: "enum",
    enum: ReturnStatus,
    default: ReturnStatus.REQUESTED,
  })
  status: ReturnStatus;

  @Column({
    type: "enum",
    enum: InventoryDisposition,
    default: InventoryDisposition.NO_RETURN_REQUIRED,
  })
  disposition: InventoryDisposition;

  @Column({ type: "timestamp", nullable: true })
  receivedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  disposedAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
