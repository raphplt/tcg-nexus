import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Order } from "./order.entity";
import { OrderItem } from "./order-item.entity";

/**
 * Verified purchase review left by a buyer for a seller on a delivered order item (MKT-03).
 */
@Entity("seller_review")
@Index(["seller"])
export class SellerReview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  @ManyToOne(() => Order, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @OneToOne(() => OrderItem, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "order_item_id" })
  orderItem: OrderItem;

  @Column({ type: "int" })
  rating: number; // 1 to 5

  @Column({ type: "text", nullable: true })
  comment?: string | null;

  @Column({ type: "boolean", default: true })
  verifiedPurchase: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
