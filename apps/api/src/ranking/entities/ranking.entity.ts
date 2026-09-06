import { Player } from "src/player/entities/player.entity";
import { Tournament } from "src/tournament/entities/tournament.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
@Index(["tournament", "player"], { unique: true }) // Unique constraint: A player can only have one ranking entry per tournament
export class Ranking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Tournament,
    (tournament) => tournament.rankings,
    {
      onDelete: "CASCADE",
    },
  )
  tournament: Tournament;

  @ManyToOne(
    () => Player,
    (player) => player.rankings,
    {
      onDelete: "CASCADE",
    },
  )
  player: Player;

  @Column()
  rank: number;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  draws: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Column({ type: "decimal", precision: 6, scale: 3, default: 0 })
  omwPercentage: number;

  @Column({ type: "decimal", precision: 6, scale: 3, default: 0 })
  gwPercentage: number;

  @Column({ type: "decimal", precision: 6, scale: 3, default: 0 })
  ogwPercentage: number;

  @Column({ default: 0 })
  byesCount: number;

  @Column({ default: true })
  isProvisional: boolean;

  @Column({ type: "text", nullable: true })
  tiebreakExplanation?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
