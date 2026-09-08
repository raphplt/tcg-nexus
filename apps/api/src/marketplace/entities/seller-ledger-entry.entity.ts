import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Currency } from "../../common/enums/currency";
import { SellerLedgerEntryKind } from "../../common/enums/seller-settlement";
import { SellerAllocation } from "./seller-allocation.entity";
import { SellerPayout } from "./seller-payout.entity";
import { SellerSettlementAccount } from "./seller-settlement-account.entity";

/**
 * Append-only record of one seller balance movement (MKT-06).
 *
 * Deltas are integer minor units so a replayed or concurrent operation can never
 * introduce rounding drift, and so the stored account balances can be proven
 * equal to the sum of their entries. Entries are never updated or deleted; a
 * reversal is expressed as another entry.
 */
@Entity("seller_ledger_entry")
@Unique(["account", "requestKey"])
@Index(["account", "createdAt"])
export class SellerLedgerEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => SellerSettlementAccount, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "account_id" })
  account: SellerSettlementAccount;

  @Column({ type: "enum", enum: Currency, default: Currency.EUR })
  currency: Currency;

  @Column({ type: "varchar", length: 40 })
  kind: SellerLedgerEntryKind;

  /** Escrowed funds awaiting delivery, in minor units. */
  @Column({ type: "integer", default: 0 })
  deltaPendingCents: number;

  /** Withdrawable funds, in minor units. */
  @Column({ type: "integer", default: 0 })
  deltaAvailableCents: number;

  /** Funds frozen by an open claim, in minor units. */
  @Column({ type: "integer", default: 0 })
  deltaOnHoldCents: number;

  /** Funds confirmed as disbursed, in minor units. */
  @Column({ type: "integer", default: 0 })
  deltaPaidOutCents: number;

  @ManyToOne(() => SellerAllocation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "allocation_id" })
  allocation?: SellerAllocation | null;

  @ManyToOne(() => SellerPayout, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "payout_id" })
  payout?: SellerPayout | null;

  /** Refund operation that produced this adjustment, when applicable. */
  @Column({ type: "varchar", length: 64, nullable: true })
  refundOperationId?: string | null;

  /**
   * Durable idempotency key, unique per account. A replayed business event
   * carrying the same key is recorded once and changes no balance twice.
   */
  @Column({ type: "varchar", length: 160 })
  requestKey: string;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}
