import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Player } from 'src/player/entities/player.entity';
import { Match } from 'src/match/entities/match.entity';

@Entity()
export class Statistics {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Player, (player) => player.statistics)
  player: Player;

  @ManyToOne(() => Match, (match) => match.statistics)
  match: Match;

  @Column()
  points: number;

  @Column()
  aces: number;

  @Column()
  faults: number;
}
