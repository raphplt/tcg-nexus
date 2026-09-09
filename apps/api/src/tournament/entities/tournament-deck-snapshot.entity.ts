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
/** Outcome of checking a submitted list against the rules that could be read. */
export enum DeckLegalityStatus {
  VALID = "valid",
  INVALID = "invalid",
  UNVERIFIED = "unverified",
}

@Entity("tournament_deck_snapshot")
@Index(["tournament", "player"], { unique: true })
export class TournamentDeckSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Tournament,
    (tournament) => tournament.deckSnapshots,
    {
      onDelete: "CASCADE",
    },
  )
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

  /**
   * Legality decided by the catalog and rule data available.
   *
   * `unverified` means the rules could not be checked — an unknown format, a
   * card without legality data — and is never presented as a valid list.
   */
  @Column({
    type: "varchar",
    length: 16,
    default: DeckLegalityStatus.UNVERIFIED,
  })
  legalityStatus: DeckLegalityStatus;

  /** True only when every checked rule passed; kept for existing clients. */
  @Column({ default: true })
  isValid: boolean;

  /** Number of submissions recorded for this snapshot. */
  @Column({ type: "int", default: 1 })
  revision: number;

  /** Organizer who overrode the computed legality, when one did. */
  @Column({ type: "int", nullable: true })
  overriddenByUserId?: number | null;

  @Column({ type: "text", nullable: true })
  overrideReason?: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  overriddenAt?: Date | null;

  @Column({ type: "jsonb", nullable: true })
  validationErrors?: string[] | null;

  @CreateDateColumn()
  submittedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  lockedAt?: Date | null;
}
