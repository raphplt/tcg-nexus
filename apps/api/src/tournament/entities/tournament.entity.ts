import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Match } from 'src/match/entities/match.entity';
import { Player } from 'src/player/entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import { TournamentRegistration } from './tournament-registration.entity';
import { TournamentReward } from './tournament-reward.entity';
import { TournamentPricing } from './tournament-pricing.entity';
import { TournamentOrganizer } from './tournament-organizer.entity';
import { TournamentNotification } from './tournament-notification.entity';

export enum TournamentType {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  SWISS_SYSTEM = 'swiss_system',
  ROUND_ROBIN = 'round_robin'
}

export enum TournamentStatus {
  DRAFT = 'draft',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

@Entity()
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: TournamentType,
    default: TournamentType.SINGLE_ELIMINATION
  })
  type: TournamentType;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT
  })
  status: TournamentStatus;

  @Column({ default: false })
  isFinished?: boolean;

  @Column({ nullable: true })
  maxPlayers?: number;

  @Column({ nullable: true })
  minPlayers?: number;

  @Column({ default: 0, nullable: true })
  currentRound?: number;

  @Column({ default: 0, nullable: true })
  totalRounds?: number;

  @Column({ type: 'timestamp', nullable: true })
  registrationDeadline?: Date;

  @Column({ default: true, nullable: true })
  allowLateRegistration?: boolean;

  @Column({ default: false })
  requiresApproval: boolean;

  @Column({ type: 'text', nullable: true })
  rules: string;

  @Column({ type: 'text', nullable: true })
  additionalInfo: string;

  @Column({ nullable: true })
  ageRestrictionMin: number;

  @Column({ nullable: true })
  ageRestrictionMax: number;

  @Column({ type: 'simple-array', nullable: true })
  allowedFormats: string[];

  @Column({ default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Match, (match) => match.tournament, { cascade: true })
  matches: Match[];

  @ManyToMany(() => Player, (player) => player.tournaments)
  @JoinTable({
    name: 'tournament_players',
    joinColumn: { name: 'tournament_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'player_id', referencedColumnName: 'id' }
  })
  players: Player[];

  @OneToMany(() => Ranking, (ranking) => ranking.tournament, { cascade: true })
  rankings: Ranking[];

  @OneToMany(
    () => TournamentRegistration,
    (registration) => registration.tournament,
    { cascade: true }
  )
  registrations: TournamentRegistration[];

  @OneToMany(() => TournamentReward, (reward) => reward.tournament, {
    cascade: true
  })
  rewards: TournamentReward[];

  @OneToOne(() => TournamentPricing, (pricing) => pricing.tournament, {
    cascade: true
  })
  @JoinColumn()
  pricing: TournamentPricing;

  @OneToMany(() => TournamentOrganizer, (organizer) => organizer.tournament, {
    cascade: true
  })
  organizers: TournamentOrganizer[];

  @OneToMany(
    () => TournamentNotification,
    (notification) => notification.tournament,
    {
      cascade: true
    }
  )
  notifications: TournamentNotification[];
}
