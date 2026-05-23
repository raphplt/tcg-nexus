import { User } from "src/user/entities/user.entity";
import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("user_follow")
@Index(["follower", "followed"], { unique: true })
export class UserFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => User,
    (user) => user.following,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "follower_id" })
  follower: User;

  @ManyToOne(
    () => User,
    (user) => user.followers,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "followed_id" })
  followed: User;

  @CreateDateColumn()
  createdAt: Date;
}
