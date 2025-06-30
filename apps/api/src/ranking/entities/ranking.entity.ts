import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Player } from 'src/player/entities/player.entity';

@Entity()
@Index(['tournament', 'player'], { unique: true }) // Un joueur ne peut avoir qu'un seul classement par tournoi
export class Ranking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.rankings, {
    onDelete: 'CASCADE'
  })
  tournament: Tournament;

  @ManyToOne(() => Player, (player) => player.rankings, {
    onDelete: 'CASCADE'
  })
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

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  winRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
