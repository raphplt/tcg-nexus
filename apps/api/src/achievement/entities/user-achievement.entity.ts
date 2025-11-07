import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Achievement } from './achievement.entity';

@Entity()
@Index(['userId', 'achievementId'], { unique: true }) // Un user ne peut avoir qu'une fois le même achievement
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  achievementId: number;

  @Column({ default: 0 })
  progress: number; // Progression actuelle (ex: 5 sur 10 tournois)

  @Column({ default: false })
  isUnlocked: boolean; // Si l'achievement est débloqué

  @Column({ type: 'timestamp', nullable: true })
  unlockedAt: Date; // Date de déblocage

  @Column({ default: false })
  isNotified: boolean; // Si l'utilisateur a été notifié du déblocage

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Achievement, (achievement) => achievement.userAchievements, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

