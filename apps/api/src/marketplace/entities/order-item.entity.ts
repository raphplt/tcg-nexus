import { FulfillmentStatus } from "src/common/enums/fulfillment-status";
import { ProductKind } from "src/common/enums/product-kind";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Listing } from "./listing.entity";
import { Order } from "./order.entity";

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Order,
    (order) => order.orderItems,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "order_id" })
  order: Order;

  @ManyToOne(
    () => Listing,
    (listing) => listing.orderItems,
    {
      nullable: true,
      onDelete: "SET NULL",
    },
  )
  @JoinColumn({ name: "listing_id" })
  listing?: Listing | null;

  @Index()
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "seller_id" })
  seller?: User | null;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "int" })
  quantity: number;

  // Allocated shipping cost portion carried by this order item
  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: "int", default: 3 })
  handlingTimeDays: number;

  @Column({ type: "enum", enum: ProductKind, default: ProductKind.CARD })
  productKind: ProductKind;

  @Column({ type: "varchar", length: 255, default: "" })
  productName: string;

  @Column({ type: "varchar", length: 512, nullable: true })
  productImage: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  productCondition: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  productLanguage: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  productSetName: string | null;

  @Column({ type: "varchar", length: 255, default: "" })
  sellerName: string;

  @Column({
    type: "enum",
    enum: FulfillmentStatus,
    default: FulfillmentStatus.TO_SHIP,
  })
  fulfillmentStatus: FulfillmentStatus;

  @Column({ type: "varchar", length: 64, nullable: true })
  carrier: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  trackingNumber: string | null;

  @Column({ type: "timestamp", nullable: true })
  shippedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  deliveredAt: Date | null;
}
