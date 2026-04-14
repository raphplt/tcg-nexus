import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ChallengeType, ChallengeActionType } from "../enums/challenge.enum";

@Entity()
export class Challenge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column("text")
  description: string;

  @Column({
    type: "enum",
    enum: ChallengeType,
    default: ChallengeType.DAILY,
  })
  type: ChallengeType;

  @Column({
    type: "enum",
    enum: ChallengeActionType,
  })
  actionType: ChallengeActionType;

  @Column({ type: "int", default: 1 })
  targetValue: number;

  @Column({ type: "int", default: 50 })
  rewardXp: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
