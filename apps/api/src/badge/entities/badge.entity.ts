import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { UserBadge } from "./user-badge.entity";

export enum BadgeCategory {
  COLLECTION = "collection",
  TOURNAMENT = "tournament",
  DECK = "deck",
  MARKETPLACE = "marketplace",
}

@Entity("badge")
export class Badge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  icon: string;

  @Column({ type: "enum", enum: BadgeCategory })
  category: BadgeCategory;

  @Column({ type: "int" })
  threshold: number;

  @OneToMany(
    () => UserBadge,
    (userBadge) => userBadge.badge,
  )
  userBadges: UserBadge[];

  @CreateDateColumn()
  createdAt: Date;
}
