import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
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

  @OneToOne(() => Tournament, (tournament) => tournament.pricing, {
    onDelete: 'CASCADE'
  })
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

  @Column({ type: 'timestamp', nullable: true })
  earlyBirdDeadline: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lateRegistrationPrice: number;

  @Column({ type: 'timestamp', nullable: true })
  lateRegistrationStart: Date;

  @Column({ type: 'text', nullable: true })
  priceDescription: string;

  @Column({ default: true })
  refundable: boolean;

  @Column({ type: 'timestamp', nullable: true })
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
