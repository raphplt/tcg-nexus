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

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255, nullable: true })
  transactionId: string;

  @Column("decimal", { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "enum", enum: Currency, nullable: true })
  currency: Currency | null;

  /**
   * Set when money was captured for an order that can no longer be honoured,
   * typically a payment succeeding after its reservation was cancelled. The
   * buyer is owed a refund until {@link compensatedAt} is set.
   */
  @Column({ type: "timestamp with time zone", nullable: true })
  compensationRequiredAt: Date | null;

  /** Why the capture needs compensating, for the operator handling it. */
  @Column({ type: "text", nullable: true })
  compensationReason: string | null;

  /** Moment the owed refund was issued to the provider. */
  @Column({ type: "timestamp with time zone", nullable: true })
  compensatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
