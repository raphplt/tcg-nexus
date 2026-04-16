import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum NotificationType {
  TOURNAMENT_REGISTRATION_CONFIRMED = "TOURNAMENT_REGISTRATION_CONFIRMED",
  TOURNAMENT_STARTED = "TOURNAMENT_STARTED",
  MATCH_ASSIGNED = "MATCH_ASSIGNED",
  TOURNAMENT_RESULT = "TOURNAMENT_RESULT",
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @Column()
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
