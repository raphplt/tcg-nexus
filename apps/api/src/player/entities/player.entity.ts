import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany
} from 'typeorm';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Statistics } from 'src/statistics/entities/statistic.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => Tournament, (tournament) => tournament.players)
  tournaments: Tournament[];

  @OneToMany(() => Statistics, (stats) => stats.player)
  statistics: Statistics[];

  @OneToMany(() => Ranking, (ranking) => ranking.player)
  rankings: Ranking[];
}
