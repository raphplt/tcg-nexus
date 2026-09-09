import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
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
import { InventoryMovementKind } from "../../common/enums/inventory-movement";
import { Listing } from "./listing.entity";
import { OrderItem } from "./order-item.entity";
import { ReturnItem } from "./return-item.entity";

/**
 * Append-only record of one physical copy movement (INT-02, MKT-02).
 *
 * Deltas are whole copies and always sum to zero across the available, reserved
 * and sold columns, so a movement redistributes a collection item's copies
 * without inventing or destroying any. Entries are never updated or deleted; a
 * reversal is expressed as another entry.
 */
@Entity("inventory_movement")
@Unique(["collectionItem", "requestKey"])
@Index(["collectionItem", "createdAt"])
export class InventoryMovement {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => CollectionItem, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "collection_item_id" })
  collectionItem: CollectionItem;

  @Column({ type: "varchar", length: 40 })
  kind: InventoryMovementKind;

  /** Copies added to or removed from the freely available pool. */
  @Column({ type: "integer", default: 0 })
  deltaAvailable: number;

  /** Copies added to or removed from listing-held reservations. */
  @Column({ type: "integer", default: 0 })
  deltaReserved: number;

  /** Copies added to or removed from fulfilled sales. */
  @Column({ type: "integer", default: 0 })
  deltaSold: number;

  @ManyToOne(() => Listing, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "listing_id" })
  listing?: Listing | null;

  @ManyToOne(() => OrderItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "order_item_id" })
  orderItem?: OrderItem | null;

  @ManyToOne(() => ReturnItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "return_item_id" })
  returnItem?: ReturnItem | null;

  /**
   * Durable idempotency key, unique per collection item. A replayed transition
   * carrying the same key is recorded once and moves no copy twice.
   */
  @Column({ type: "varchar", length: 160 })
  requestKey: string;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}
