import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["winner"])
@Index(["loser"])
@Index("IDX_ranked_history_created_at", ["createdAt"])
@Index("IDX_ranked_history_match_id", ["matchId"], {
  where: '"matchId" IS NOT NULL',
})
@Index("IDX_ranked_history_casual_session_id", ["casualSessionId"], {
  where: '"casualSessionId" IS NOT NULL',
})
export class RankedMatchHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", nullable: true })
  casualSessionId: number | null;

  @Column({ type: "int", nullable: true })
  matchId: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  winner: User | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  loser: User | null;

  @Column({ type: "int" })
  winnerEloBefore: number;

  @Column({ type: "int" })
  winnerEloAfter: number;

  @Column({ type: "int" })
  loserEloBefore: number;

  @Column({ type: "int" })
  loserEloAfter: number;

  @Column({ type: "int" })
  delta: number;

  @Column({ type: "boolean", default: false })
  isDraw: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
