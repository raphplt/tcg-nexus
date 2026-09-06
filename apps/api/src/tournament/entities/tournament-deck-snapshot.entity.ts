import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Deck } from "../../deck/entities/deck.entity";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import { Tournament } from "./tournament.entity";

export interface SnapshotCardItem {
  cardId: string;
  name: string;
  quantity: number;
  role?: string;
  supertype?: string;
  setCode?: string;
}

/**
 * Immutable decklist snapshot submitted by a player for a tournament.
 * Locked at round start to prevent retroactive deck alteration (TRN-02).
 */
@Entity("tournament_deck_snapshot")
@Index(["tournament", "player"], { unique: true })
export class TournamentDeckSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.deckSnapshots, {
    onDelete: "CASCADE",
  })
  tournament: Tournament;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  player: Player;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  user?: User | null;

  @ManyToOne(() => Deck, { nullable: true, onDelete: "SET NULL" })
  deck?: Deck | null;

  @Column({ length: 255 })
  deckName: string;

  @Column({ type: "int", nullable: true })
  formatId?: number | null;

  @Column({ length: 50, default: "STANDARD_2026" })
  ruleVersion: string;

  @Column({ type: "jsonb" })
  cardsSnapshot: SnapshotCardItem[];

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: true })
  isValid: boolean;

  @Column({ type: "jsonb", nullable: true })
  validationErrors?: string[] | null;

  @CreateDateColumn()
  submittedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  lockedAt?: Date | null;
}
