import { CardGame } from "src/common/enums/cardGame";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { PokemonSerieTranslation } from "./pokemon-serie-translation.entity";

@Entity()
export class PokemonSerie {
  @PrimaryColumn()
  id: string; // Serie Unique ID

  @Column({ type: "enum", enum: CardGame, default: CardGame.Pokemon })
  game: CardGame;

  @Column()
  name: string; // Serie Name

  @Column({ nullable: true })
  logo?: string; // Serie logo (asset, nullable)

  // Relation vers les sets de cette série
  @OneToMany(
    () => PokemonSet,
    (pokemonSet) => pokemonSet.serie,
  )
  sets: PokemonSet[];

  /** Nom et logo par langue ; `name` et `logo` ci-dessus en sont l'héritage. */
  @OneToMany(
    () => PokemonSerieTranslation,
    (translation) => translation.serie,
    { cascade: true },
  )
  translations?: PokemonSerieTranslation[];
}
