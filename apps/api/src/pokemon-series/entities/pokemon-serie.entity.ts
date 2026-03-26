import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { CardGame } from 'src/common/enums/cardGame';

@Entity()
export class PokemonSerie {
  @PrimaryColumn()
  id: string; // Serie Unique ID

  @Column({ type: 'enum', enum: CardGame, default: CardGame.Pokemon })
  game: CardGame;

  @Column()
  name: string; // Serie Name

  @Column({ nullable: true })
  logo?: string; // Serie logo (asset, nullable)

  // Relation vers les sets de cette série
  @OneToMany(() => PokemonSet, (pokemonSet) => pokemonSet.serie)
  sets: PokemonSet[];
}
