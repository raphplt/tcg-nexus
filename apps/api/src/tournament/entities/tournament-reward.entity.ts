import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tournament } from './tournament.entity';

export enum RewardType {
  CASH = 'cash',
  PRODUCT = 'product',
  POINTS = 'points',
  TITLE = 'title',
  OTHER = 'other'
}

@Entity()
export class TournamentReward {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.rewards, {
    onDelete: 'CASCADE'
  })
  tournament: Tournament;

  @Column()
  position: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RewardType
  })
  type: RewardType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashValue: number;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  productBrand: string;

  @Column({ type: 'integer', nullable: true })
  pointsValue: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
