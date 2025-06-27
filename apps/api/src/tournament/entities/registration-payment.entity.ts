import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { TournamentRegistration } from './tournament-registration.entity';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

@Entity()
export class RegistrationPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => TournamentRegistration,
    (registration) => registration.payments,
    {
      onDelete: 'CASCADE'
    }
  )
  registration: TournamentRegistration;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  transactionId: string; // ID de transaction externe

  @Column({ nullable: true })
  paymentIntentId: string; // Pour Stripe par exemple

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundedAmount: number;

  @Column({ nullable: true })
  refundedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
