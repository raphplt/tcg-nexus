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
import { SellerAllocationStatus } from "../../common/enums/seller-settlement";
import { User } from "../../user/entities/user.entity";
import { Order } from "./order.entity";

/**
 * Immutable allocation ledger record for a seller in a marketplace order (MKT-06).
 */
@Entity("seller_allocation")
@Index(["order"])
@Index(["seller", "status"])
export class SellerAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  @Column({ type: "enum", enum: Currency, default: Currency.EUR })
  currency: Currency;

  /** Total merchandise price for this seller's items */
  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  /** Shipping cost portion assigned to this seller */
  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  shippingAmount: number;

  /** Platform commission percentage (e.g. 0.05 for 5%) */
  @Column("decimal", { precision: 5, scale: 4, default: 0.05 })
  commissionRate: number;

  /** Calculated commission amount deducted by platform */
  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  commissionAmount: number;

  /** Net payable amount to seller (gross + shipping - commission - refunded) */
  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  netAmount: number;

  /** Total refunds deducted from this seller's allocation */
  @Column("decimal", { precision: 12, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({
    type: "enum",
    enum: SellerAllocationStatus,
    default: SellerAllocationStatus.PENDING_DELIVERY,
  })
  status: SellerAllocationStatus;

  /** Timestamp when allocation becomes eligible for release/payout */
  @Column({ type: "timestamp with time zone", nullable: true })
  eligibleAt?: Date | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;
}
