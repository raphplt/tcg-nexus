import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Player } from 'src/player/entities/player.entity';
import { Statistics } from 'src/statistics/entities/statistic.entity';

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
  FORFEIT = 'forfeit'
}

export enum MatchPhase {
  QUALIFICATION = 'qualification',
  ROUND_OF_64 = 'round_of_64',
  ROUND_OF_32 = 'round_of_32',
  ROUND_OF_16 = 'round_of_16',
  QUARTER_FINAL = 'quarter_final',
  SEMI_FINAL = 'semi_final',
  THIRD_PLACE = 'third_place',
  FINAL = 'final'
}

@Entity()
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.matches, {
    onDelete: 'CASCADE'
  })
  tournament: Tournament;

  @ManyToOne(() => Player, { nullable: true })
  playerA: Player;

  @ManyToOne(() => Player, { nullable: true })
  playerB: Player;

  @ManyToOne(() => Player, { nullable: true })
  winner?: Player;

  @Column({ default: 1 })
  round: number;

  @Column({
    type: 'enum',
    enum: MatchPhase,
    default: MatchPhase.QUALIFICATION
  })
  phase: MatchPhase;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.SCHEDULED
  })
  status: MatchStatus;

  @Column({ nullable: true })
  scheduledDate: Date;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  finishedAt?: Date;

  @Column({ default: 0 })
  playerAScore: number;

  @Column({ default: 0 })
  playerBScore: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Statistics, (stats) => stats.match, { cascade: true })
  statistics: Statistics[];
}
