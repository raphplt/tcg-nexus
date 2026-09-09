import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Collection } from "src/collection/entities/collection.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { OrderItem } from "./order-item.entity";

/**
 * Record of copies of one purchased order line received into a collection (INT-03).
 *
 * Receipt identity belongs to the order line and its buyer, not to the
 * destination collection, so importing the same purchase into a second
 * collection cannot duplicate the copies that were actually bought. Deleting the
 * created collection item leaves this record, which keeps the cumulative
 * received quantity truthful.
 */
@Entity("receipt_import")
@Unique(["orderItem", "requestKey"])
@Index(["orderItem"])
export class ReceiptImport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => OrderItem, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "order_item_id" })
  orderItem: OrderItem;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  @ManyToOne(() => Collection, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "collection_id" })
  collection?: Collection | null;

  @ManyToOne(() => CollectionItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "collection_item_id" })
  collectionItem?: CollectionItem | null;

  /** Copies of the order line received by this import. */
  @Column({ type: "integer", default: 1 })
  quantity: number;

  /**
   * Durable idempotency key, unique per order line. A retried request under the
   * same key returns the existing receipt instead of importing the copies twice.
   */
  @Column({ type: "varchar", length: 160 })
  requestKey: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}
