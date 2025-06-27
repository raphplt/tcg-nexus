import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Player } from 'src/player/entities/player.entity';
import { Match } from 'src/match/entities/match.entity';

@Entity()
@Index(['player', 'match'], { unique: true })
export class Statistics {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Player, (player) => player.statistics, {
    onDelete: 'CASCADE'
  })
  player: Player;

  @ManyToOne(() => Match, (match) => match.statistics, {
    onDelete: 'CASCADE'
  })
  match: Match;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  aces: number;

  @Column({ default: 0 })
  faults: number;

  @Column({ default: 0 })
  cardsPlayed: number;

  @Column({ default: 0 })
  damageDealt: number;

  @Column({ default: 0 })
  damageTaken: number;

  @Column({ default: false })
  isWinner: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
