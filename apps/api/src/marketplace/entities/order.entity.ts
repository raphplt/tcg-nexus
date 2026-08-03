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
  /** Stock réservé, paiement pas encore confirmé par Stripe. */
  PENDING = "Pending",
  PAID = "Paid",
  SHIPPED = "Shipped",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
  REFUNDED = "Refunded",
}

/**
 * Transitions autorisées. Toute autre transition est refusée : le statut
 * d'une commande engage à la fois du stock et l'argent du client.
 */
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

  @Index()
  @Column({ type: "enum", enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: "enum", enum: Currency })
  currency: Currency;

  /**
   * Adresse figée au moment de la commande : modifier son profil plus tard
   * ne doit pas réécrire où le colis devait partir.
   */
  @Column({ type: "text", default: "" })
  shippingAddress: string;

  /**
   * Échéance de la réservation de stock d'une commande PENDING. Passé ce
   * délai sans paiement confirmé, la commande est annulée et le stock rendu.
   */
  @Column({ type: "timestamp", nullable: true })
  reservationExpiresAt: Date | null;

  /** Empêche un rejeu de webhook de réincrémenter deux fois les stocks. */
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
