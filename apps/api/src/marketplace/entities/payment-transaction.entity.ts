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
import { Currency } from "../../common/enums/currency";
import { Order } from "./order.entity";

export enum PaymentMethod {
  CREDIT_CARD = "CreditCard",
  PAYPAL = "PayPal",
  BANK_TRANSFER = "BankTransfer",
  CRYPTO = "Crypto",
}

export enum PaymentStatus {
  INITIATED = "Initiated",
  COMPLETED = "Completed",
  FAILED = "Failed",
  REFUNDED = "Refunded",
}

@Entity()
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Order,
    (order) => order.payments,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ type: "enum", enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: "enum", enum: PaymentStatus })
  status: PaymentStatus;

  /**
   * Identifiant du PaymentIntent Stripe. Unique : un même paiement ne peut
   * jamais être rattaché à deux commandes.
   */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 255, nullable: true })
  transactionId: string;

  @Column("decimal", { precision: 12, scale: 2 })
  amount: number;

  /** Devise du paiement, vérifiée contre celle de la commande. */
  @Column({ type: "enum", enum: Currency, nullable: true })
  currency: Currency | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
