import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum TrainingDifficulty {
  EASY = "easy",
  STANDARD = "standard",
}

export enum TrainingMatchSessionStatus {
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

export enum TrainingMatchWinnerSide {
  PLAYER = "PLAYER",
  AI = "AI",
}

@Entity()
export class TrainingMatchSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @Column({
    type: "enum",
    enum: TrainingMatchSessionStatus,
    default: TrainingMatchSessionStatus.ACTIVE,
  })
  status: TrainingMatchSessionStatus;

  @Column({ type: "bigint" })
  seed: string;

  @Column({ type: "int" })
  playerDeckId: number;

  @Column({ type: "varchar", length: 100 })
  aiDeckPresetId: string;

  @Column({
    type: "enum",
    enum: TrainingDifficulty,
  })
  aiDifficulty: TrainingDifficulty;

  @Column({ type: "jsonb" })
  serializedState: Record<string, unknown>;

  @Column({ type: "jsonb", default: () => "'[]'" })
  eventLog: Record<string, unknown>[];

  @Column({ type: "varchar", nullable: true })
  winnerSide: TrainingMatchWinnerSide | null;

  @Column({ type: "varchar", nullable: true })
  endedReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
