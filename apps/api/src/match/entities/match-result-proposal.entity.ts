import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import { Match } from "./match.entity";
import {
  OpponentResponse,
  ProposalStatus,
} from "../../common/enums/match-result-status";

/**
 * Score proposal submitted by a tournament player awaiting opponent confirmation or organizer resolution.
 */
@Entity("match_result_proposal")
export class MatchResultProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Match,
    (match) => match.proposals,
    {
      onDelete: "CASCADE",
    },
  )
  match: Match;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  proposerPlayer: Player;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  proposerUser?: User | null;

  @Column({ default: 0 })
  playerAScore: number;

  @Column({ default: 0 })
  playerBScore: number;

  @Column({
    type: "varchar",
    length: 50,
    default: ProposalStatus.PENDING_CONFIRMATION,
  })
  status: ProposalStatus;

  @Column({
    type: "varchar",
    length: 50,
    default: OpponentResponse.PENDING,
  })
  opponentResponse: OpponentResponse;

  @Column({ type: "text", nullable: true })
  disputeReason?: string | null;

  @Column({ type: "text", nullable: true })
  organizerResolutionReason?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  resolvedByUser?: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
