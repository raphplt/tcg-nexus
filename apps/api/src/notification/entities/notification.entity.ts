import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => User,
    (user) => user.notifications,
    { onDelete: "CASCADE" },
  )
  user: User;

  @Column()
  title: string;

  @Column({ type: "text" })
  body: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: "varchar", default: "info" })
  type: string;

  @Column({ type: "jsonb", nullable: true })
  data: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
