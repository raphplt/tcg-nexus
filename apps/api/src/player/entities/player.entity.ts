import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Statistics } from 'src/statistics/entities/statistic.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import { User } from 'src/user/entities/user.entity';

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.player)
  @JoinColumn()
  user: User;

  @ManyToMany(() => Tournament, (tournament) => tournament.players)
  tournaments: Tournament[];

  @OneToMany(() => Statistics, (stats) => stats.player)
  statistics: Statistics[];

  @OneToMany(() => Ranking, (ranking) => ranking.player)
  rankings: Ranking[];
}
