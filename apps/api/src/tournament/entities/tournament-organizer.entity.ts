import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from 'src/user/entities/user.entity';

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

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  userId: User;

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
