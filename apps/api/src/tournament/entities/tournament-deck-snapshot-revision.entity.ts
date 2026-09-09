import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import {
  DeckLegalityStatus,
  SnapshotCardItem,
  TournamentDeckSnapshot,
} from "./tournament-deck-snapshot.entity";

/**
 * Append-only history of one tournament deck submission (TRN-02).
 *
 * Every submission is kept with the legality decided for it, so an organizer
 * can see what a player registered before a correction and what the rules said
 * about it at that moment.
 */
@Entity("tournament_deck_snapshot_revision")
@Unique(["snapshot", "revision"])
@Index(["snapshot"])
export class TournamentDeckSnapshotRevision {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TournamentDeckSnapshot, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "snapshot_id" })
  snapshot: TournamentDeckSnapshot;

  @Column({ type: "int" })
  revision: number;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "submitted_by_user_id" })
  submittedBy?: User | null;

  @Column({ type: "jsonb" })
  cardsSnapshot: SnapshotCardItem[];

  @Column({ type: "varchar", length: 16 })
  legalityStatus: DeckLegalityStatus;

  @Column({ type: "jsonb", nullable: true })
  validationErrors?: string[] | null;

  @Column({ type: "varchar", length: 50 })
  ruleVersion: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}
