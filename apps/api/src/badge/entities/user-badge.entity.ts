import { User } from "src/user/entities/user.entity";
import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
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
