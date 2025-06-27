import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tournament } from './tournament.entity';

export enum NotificationType {
  TOURNAMENT_CREATED = 'tournament_created',
  REGISTRATION_OPENED = 'registration_opened',
  REGISTRATION_CLOSED = 'registration_closed',
  TOURNAMENT_STARTED = 'tournament_started',
  ROUND_STARTED = 'round_started',
  MATCH_SCHEDULED = 'match_scheduled',
  RESULTS_PUBLISHED = 'results_published',
  TOURNAMENT_FINISHED = 'tournament_finished',
  PAYMENT_REMINDER = 'payment_reminder',
  GENERAL_ANNOUNCEMENT = 'general_announcement'
}

export enum NotificationStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed'
}

@Entity()
export class TournamentNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  tournament: Tournament;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.DRAFT
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  scheduledFor: Date; // Pour programmer l'envoi

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ default: 0 })
  recipientCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ type: 'simple-array', nullable: true })
  targetRoles: string[]; // players, organizers, all

  @Column({ type: 'text', nullable: true })
  failureReasons: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
