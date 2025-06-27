import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tournament } from './tournament.entity';

export enum OrganizerRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  JUDGE = 'judge'
}

@Entity()
export class TournamentOrganizer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  tournament: Tournament;

  @Column()
  userId: number; // Référence vers l'utilisateur

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: OrganizerRole
  })
  role: OrganizerRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  responsibilities: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
