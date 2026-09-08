import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
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
  Unique,
} from "typeorm";
import { Collection } from "./collection.entity";

/** Kind of bulk change recorded, which decides how it is compensated. */
export enum BulkOperationKind {
  CSV_IMPORT = "csv_import",
  BULK_MOVE = "bulk_move",
  BULK_DELETE = "bulk_delete",
}

/** Whether a recorded operation is still applied to the collection. */
export enum BulkOperationStatus {
  APPLIED = "applied",
  UNDONE = "undone",
}

/**
 * Durable record of one bulk change to a collection (COL-04).
 *
 * Undo compensates the deltas recorded in {@link lines} instead of deleting
 * every item that happens to carry an operation identifier, so inventory that
 * predates the operation survives it.
 */
@Entity("collection_bulk_operation")
@Unique(["collection", "operationId"])
@Index(["collection", "createdAt"])
export class CollectionBulkOperation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Collection, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "collection_id" })
  collection: Collection;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  /** Client-supplied or generated identity, unique within the collection. */
  @Column({ type: "varchar", length: 128 })
  operationId: string;

  @Column({ type: "varchar", length: 32 })
  kind: BulkOperationKind;

  /** Import mode, when the operation is a CSV import. */
  @Column({ type: "varchar", length: 32, nullable: true })
  mode?: string | null;

  @Column({ type: "varchar", length: 16, default: BulkOperationStatus.APPLIED })
  status: BulkOperationStatus;

  /** Summary returned to a replayed request, so it answers identically. */
  @Column({ type: "jsonb", nullable: true })
  summary?: Record<string, unknown> | null;

  @OneToMany(
    () => CollectionBulkOperationLine,
    (line) => line.operation,
  )
  lines: CollectionBulkOperationLine[];

  @Column({ type: "timestamp with time zone", nullable: true })
  undoneAt?: Date | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}

/**
 * Effect of a bulk operation on one collection item (COL-04).
 *
 * The recorded deltas and previous values are what undo reverses; an item whose
 * current values no longer match is reported as a conflict rather than
 * silently overwritten.
 */
@Entity("collection_bulk_operation_line")
@Index(["operation"])
export class CollectionBulkOperationLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(
    () => CollectionBulkOperation,
    (operation) => operation.lines,
    { nullable: false, onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "operation_id" })
  operation: CollectionBulkOperation;

  @ManyToOne(() => CollectionItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "collection_item_id" })
  collectionItem?: CollectionItem | null;

  /** True when the operation created the item rather than changing one. */
  @Column({ type: "boolean", default: false })
  created: boolean;

  /** Copies added to the item's total quantity by this operation. */
  @Column({ type: "integer", default: 0 })
  quantityDelta: number;

  /** Copies added to the item's available quantity by this operation. */
  @Column({ type: "integer", default: 0 })
  availableDelta: number;

  /** Total quantity before the operation, for drift detection. */
  @Column({ type: "integer", nullable: true })
  previousQuantity?: number | null;

  /** Available quantity before the operation, for drift detection. */
  @Column({ type: "integer", nullable: true })
  previousAvailable?: number | null;

  /** Collection the item belonged to before a move. */
  @Column({ type: "varchar", length: 64, nullable: true })
  previousCollectionId?: string | null;

  /** Values needed to restore a deleted item, which returns under a new id. */
  @Column({ type: "jsonb", nullable: true })
  snapshot?: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}
