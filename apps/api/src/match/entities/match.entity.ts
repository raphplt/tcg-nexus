import { Player } from "src/player/entities/player.entity";
import { Statistics } from "src/statistics/entities/statistic.entity";
import { Tournament } from "src/tournament/entities/tournament.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { OnlineMatchSession } from "./online-match-session.entity";

export enum MatchStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
  CANCELLED = "cancelled",
  FORFEIT = "forfeit",
}

/**
 * Branch of an elimination bracket a match belongs to.
 *
 * Only elimination formats use it: round robin and Swiss matches leave it
 * null.
 */
export enum BracketSide {
  WINNERS = "winners",
  LOSERS = "losers",
  GRAND_FINAL = "grand_final",
}

export enum MatchPhase {
  QUALIFICATION = "qualification",
  ROUND_OF_64 = "round_of_64",
  ROUND_OF_32 = "round_of_32",
  ROUND_OF_16 = "round_of_16",
  QUARTER_FINAL = "quarter_final",
  SEMI_FINAL = "semi_final",
  THIRD_PLACE = "third_place",
  FINAL = "final",
}

@Entity()
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Tournament,
    (tournament) => tournament.matches,
    {
      onDelete: "CASCADE",
    },
  )
  tournament: Tournament;

  @ManyToOne(() => Player, { nullable: true })
  playerA: Player;

  @ManyToOne(() => Player, { nullable: true })
  playerB: Player;

  @ManyToOne(() => Player, { nullable: true })
  winner?: Player;

  @Column({ default: 1 })
  round: number;

  @Column({
    type: "enum",
    enum: MatchPhase,
    default: MatchPhase.QUALIFICATION,
  })
  phase: MatchPhase;

  @Column({
    type: "enum",
    enum: MatchStatus,
    default: MatchStatus.SCHEDULED,
  })
  status: MatchStatus;

  @Column({ nullable: true })
  scheduledDate: Date;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  finishedAt?: Date;

  @Column({ default: 0 })
  playerAScore: number;

  @Column({ default: 0 })
  playerBScore: number;

  @Column({ nullable: true })
  notes: string;

  /**
   * Marks an automatic qualification: the player clears the round unopposed.
   *
   * Distinct from an ordinary win, because a bye must stay out of the Swiss
   * tie-breakers and of the match statistics.
   */
  @Column({ default: false })
  isBye: boolean;

  /**
   * Branch of the bracket, for elimination formats.
   *
   * NOTE: `round` stays the global step of the tournament — winners round 2
   * and losers round 1 are played during the same step — so this column is
   * what separates the two branches.
   */
  @Column({
    type: "enum",
    enum: BracketSide,
    nullable: true,
  })
  bracketSide: BracketSide | null;

  /** Stable slot of the match inside its round; ordering by id is not enough. */
  @Column({ type: "int", nullable: true })
  bracketPosition: number | null;

  /** Match the winner is sent to, and the slot they take there. */
  @Column({ type: "int", nullable: true })
  nextMatchId: number | null;

  @Column({ type: "varchar", length: 1, nullable: true })
  nextSlot: "A" | "B" | null;

  /**
   * Match the loser drops into — winners bracket only.
   *
   * A null value means the defeat is final: the player is eliminated.
   */
  @Column({ type: "int", nullable: true })
  loserNextMatchId: number | null;

  @Column({ type: "varchar", length: 1, nullable: true })
  loserNextSlot: "A" | "B" | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => Statistics,
    (stats) => stats.match,
    { cascade: true },
  )
  statistics: Statistics[];

  @OneToOne(
    () => OnlineMatchSession,
    (session) => session.match,
    {
      nullable: true,
    },
  )
  onlineSession?: OnlineMatchSession | null;
}
