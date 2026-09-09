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
import {
  PayoutMethod,
  PayoutStatus,
} from "../../common/enums/seller-settlement";
import { User } from "../../user/entities/user.entity";
import { SellerSettlementAccount } from "./seller-settlement-account.entity";

/**
 * Payout disbursement request and execution record (MKT-06).
 */
@Entity("seller_payout")
@Index(["seller", "status"])
export class SellerPayout {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @ManyToOne(() => SellerSettlementAccount, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "account_id" })
  account?: SellerSettlementAccount | null;

  @Column({ type: "enum", enum: Currency, default: Currency.EUR })
  currency: Currency;

  @Column("decimal", { precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: "enum",
    enum: PayoutStatus,
    default: PayoutStatus.REQUESTED,
  })
  status: PayoutStatus;

  @Column({ type: "varchar", length: 100, unique: true })
  reference: string;

  /**
   * Seller-supplied idempotency key, unique per seller. A retried request
   * returns the existing payout instead of reserving the balance twice.
   */
  @Column({ type: "varchar", length: 128, nullable: true })
  requestKey?: string | null;

  /** Connected account the disbursement targets, captured when the payout is requested. */
  @Column({ type: "varchar", length: 128, nullable: true })
  providerAccountId?: string | null;

  /** Provider transfer identity, present once execution has been committed remotely. */
  @Column({ type: "varchar", length: 128, nullable: true })
  providerTransferId?: string | null;

  /**
   * First provider attempt. Retaining it keeps an ambiguous attempt recoverable
   * by provider lookup instead of issuing a second disbursement.
   */
  @Column({ type: "timestamp with time zone", nullable: true })
  providerAttemptedAt?: Date | null;

  /** External banking or provider reference evidencing a completed disbursement. */
  @Column({ type: "varchar", length: 190, nullable: true })
  transactionReference?: string | null;

  @Column({
    type: "enum",
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  payoutMethod: PayoutMethod;

  @Column({ type: "jsonb", nullable: true })
  payoutDestinationSnapshot?: Record<string, any> | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  processedAt?: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  failureReason?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
