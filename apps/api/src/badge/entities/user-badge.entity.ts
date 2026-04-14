import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "src/user/entities/user.entity";
import { Badge } from "./badge.entity";

@Entity("user_badge")
@Index(["user", "badge"], { unique: true })
export class UserBadge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => User,
    (user) => user.userBadges,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => Badge,
    (badge) => badge.userBadges,
    { eager: true, onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "badge_id" })
  badge: Badge;

  @CreateDateColumn()
  unlockedAt: Date;
}
