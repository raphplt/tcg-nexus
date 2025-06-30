import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tournament } from './tournament.entity';

export enum PricingType {
  FREE = 'free',
  PAID = 'paid',
  TIERED = 'tiered'
}

export enum PaymentStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Entity()
export class TournamentPricing {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn()
  tournament: Tournament;

  @Column({
    type: 'enum',
    enum: PricingType,
    default: PricingType.FREE
  })
  type: PricingType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  earlyBirdPrice: number;

  @Column({ nullable: true })
  earlyBirdDeadline: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lateRegistrationPrice: number;

  @Column({ nullable: true })
  lateRegistrationStart: Date;

  @Column({ type: 'text', nullable: true })
  priceDescription: string;

  @Column({ default: true })
  refundable: boolean;

  @Column({ nullable: true })
  refundDeadline: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  refundFeePercentage: number;

  @Column({ type: 'text', nullable: true })
  paymentInstructions: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
