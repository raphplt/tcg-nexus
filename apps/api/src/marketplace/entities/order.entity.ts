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
  UpdateDateColumn,
} from "typeorm";
import { Currency } from "../../common/enums/currency";
import { OrderItem } from "./order-item.entity";
import { PaymentTransaction } from "./payment-transaction.entity";

export enum OrderStatus {
  PENDING = "Pending",
  PAID = "Paid",
  SHIPPED = "Shipped",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
  REFUNDED = "Refunded",
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  @Column("decimal", { precision: 12, scale: 2 })
  totalAmount: number;

  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  shippingAmount: number;

  @Index()
  @Column({ type: "enum", enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: "enum", enum: Currency })
  currency: Currency;

  @Column({ type: "text", default: "" })
  shippingAddress: string;

  @Column({ type: "timestamp", nullable: true })
  reservationExpiresAt: Date | null;

  /** garde-fou contre un rejeu de webhook */
  @Column({ type: "boolean", default: false })
  stockReleased: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => OrderItem,
    (orderItem) => orderItem.order,
    {
      cascade: true,
    },
  )
  orderItems: OrderItem[];

  @OneToMany(
    () => PaymentTransaction,
    (payment) => payment.order,
  )
  payments: PaymentTransaction[];
}
