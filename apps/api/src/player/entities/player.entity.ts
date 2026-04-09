import { Ranking } from "src/ranking/entities/ranking.entity";
import { Statistics } from "src/statistics/entities/statistic.entity";
import { Tournament } from "src/tournament/entities/tournament.entity";
import { User } from "src/user/entities/user.entity";
import {
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(
    () => User,
    (user) => user.player,
  )
  @JoinColumn()
  user: User;

  @ManyToMany(
    () => Tournament,
    (tournament) => tournament.players,
  )
  tournaments: Tournament[];

  @OneToMany(
    () => Statistics,
    (stats) => stats.player,
  )
  statistics: Statistics[];

  @OneToMany(
    () => Ranking,
    (ranking) => ranking.player,
  )
  rankings: Ranking[];
}
