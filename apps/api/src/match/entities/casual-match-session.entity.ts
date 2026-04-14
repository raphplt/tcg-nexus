import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum CasualMatchSessionStatus {
  WAITING_FOR_DECKS = "WAITING_FOR_DECKS",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED",
}

@Entity()
export class CasualMatchSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  playerA: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  playerB: User;

  @Column({
    type: "enum",
    enum: CasualMatchSessionStatus,
    default: CasualMatchSessionStatus.WAITING_FOR_DECKS,
  })
  status: CasualMatchSessionStatus;

  @Column({ type: "bigint" })
  seed: string;

  @Column({ type: "int", nullable: true })
  playerADeckId: number | null;

  @Column({ type: "int", nullable: true })
  playerBDeckId: number | null;

  @Column({ type: "int", nullable: true })
  winnerUserId: number | null;

  @Column({ type: "varchar", nullable: true })
  endedReason: string | null;

  @Column({ type: "jsonb", nullable: true })
  serializedState: Record<string, unknown> | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  eventLog: Record<string, unknown>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
