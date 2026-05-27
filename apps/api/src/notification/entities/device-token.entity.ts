import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class DeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => User,
    (user) => user.deviceTokens,
    { onDelete: "CASCADE" },
  )
  user: User;

  @Column({ unique: true })
  token: string;

  @Column({ type: "varchar", default: "expo" })
  platform: string;

  @CreateDateColumn()
  createdAt: Date;
}
