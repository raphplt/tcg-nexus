import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Currency } from "../../common/enums/currency";
import {
  PayoutMethod,
  SellerAccountStatus,
} from "../../common/enums/seller-settlement";
import { User } from "../../user/entities/user.entity";

/**
 * Entity tracking seller escrow, available balance, payout settings, and cumulative disbursements (MKT-06).
 */
@Entity("seller_settlement_account")
@Unique(["seller", "currency"])
@Index(["seller"])
export class SellerSettlementAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @Column({ type: "enum", enum: Currency, default: Currency.EUR })
  currency: Currency;

  @Column({
    type: "enum",
    enum: SellerAccountStatus,
    default: SellerAccountStatus.PENDING_ONBOARDING,
  })
  status: SellerAccountStatus;

  @Column({
    type: "enum",
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  payoutMethod: PayoutMethod;

  @Column({ type: "jsonb", nullable: true })
  payoutDetails?: {
    accountHolderName?: string;
    ibanMasked?: string;
    bic?: string;
    bankName?: string;
    providerAccountId?: string;
  } | null;

  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  balancePending: number;

  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  balanceAvailable: number;

  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  balancePaidOut: number;

  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  balanceOnHold: number;

  @Column("decimal", { precision: 10, scale: 2, default: 10.0 })
  minimumPayoutAmount: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
