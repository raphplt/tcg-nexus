import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Player } from 'src/player/entities/player.entity';

@Entity()
export class Ranking {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Tournament, (tournament) => tournament.ranking)
  @JoinColumn()
  tournament: Tournament;

  @ManyToOne(() => Player, (player) => player.rankings)
  player: Player;

  @Column()
  rank: number;
}
