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
  position: number; // 1er, 2ème, 3ème place, etc.

  @Column()
  name: string; // Nom de la récompense

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RewardType
  })
  type: RewardType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashValue: number; // Valeur en euros si applicable

  @Column({ nullable: true })
  productName: string; // Nom du produit si type PRODUCT

  @Column({ nullable: true })
  productBrand: string;

  @Column({ type: 'integer', nullable: true })
  pointsValue: number; // Points de classement si applicable

  @Column({ nullable: true })
  imageUrl: string; // Photo de la récompense

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
