import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Match } from "./match.entity";

export enum OnlineMatchSessionStatus {
  WAITING_FOR_DECKS = "WAITING_FOR_DECKS",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

@Entity()
export class OnlineMatchSession {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match: Match;

  @Column({
    type: "enum",
    enum: OnlineMatchSessionStatus,
    default: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
  })
  status: OnlineMatchSessionStatus;

  @Column({ type: "bigint" })
  seed: string;

  @Column({ type: "int", nullable: true })
  playerADeckId: number | null;

  @Column({ type: "int", nullable: true })
  playerBDeckId: number | null;

  @Column({ type: "int", nullable: true })
  winnerPlayerId: number | null;

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
