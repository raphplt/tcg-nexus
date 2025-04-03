import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { Match } from 'src/match/entities/match.entity';
import { Player } from 'src/player/entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';

@Entity()
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Match, (match) => match.tournament)
  matches: Match[];

  @ManyToMany(() => Player, (player) => player.tournaments)
  @JoinTable()
  players: Player[];

  @OneToOne(() => Ranking, (ranking) => ranking.tournament, { cascade: true })
  @JoinColumn()
  ranking: Ranking;
}
