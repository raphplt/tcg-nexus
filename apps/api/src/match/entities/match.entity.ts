import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Player } from 'src/player/entities/player.entity';
import { Statistics } from 'src/statistics/entities/statistic.entity';

@Entity()
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.matches)
  tournament: Tournament;

  @ManyToOne(() => Player)
  playerA: Player;

  @ManyToOne(() => Player)
  playerB: Player;

  @OneToMany(() => Statistics, (stats) => stats.match, { cascade: true })
  statistics: Statistics[];
}
