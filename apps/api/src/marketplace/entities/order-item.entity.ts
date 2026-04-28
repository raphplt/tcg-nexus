import {
  Column,
  Entity,
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
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "listing_id" })
  listing: Listing;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "int" })
  quantity: number;
}
