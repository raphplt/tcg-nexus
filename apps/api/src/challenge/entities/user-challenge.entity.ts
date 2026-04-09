import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ActiveChallenge } from './active-challenge.entity';

@Entity()
@Unique(['user', 'activeChallenge']) // A user can only have one progress entry per active challenge instance
export class UserChallenge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => ActiveChallenge, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  activeChallenge: ActiveChallenge;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isClaimed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
