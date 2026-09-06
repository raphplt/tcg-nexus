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
