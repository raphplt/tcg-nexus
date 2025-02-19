import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

@Entity()
export class PokemonSerie {
  @PrimaryColumn()
  id: string; // Serie Unique ID

  @Column()
  name: string; // Serie Name

  @Column({ nullable: true })
  logo?: string; // Serie logo (asset, nullable)

  // Relation vers les sets de cette série
  @OneToMany(() => PokemonSet, (pokemonSet) => pokemonSet.serie, {
    cascade: true,
  })
  sets: PokemonSet[];
}
