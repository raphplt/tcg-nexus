import { Ranking } from "../../ranking/entities/ranking.entity";
import { Statistics } from "../../statistics/entities/statistic.entity";
import { Tournament } from "../../tournament/entities/tournament.entity";
import { User } from "../../user/entities/user.entity";
import {
  Column,
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

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 1000 })
  elo: number;

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
