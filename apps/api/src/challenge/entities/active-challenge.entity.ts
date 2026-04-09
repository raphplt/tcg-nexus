import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Challenge } from './challenge.entity';

@Entity()
export class ActiveChallenge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Challenge, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  challenge: Challenge;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
