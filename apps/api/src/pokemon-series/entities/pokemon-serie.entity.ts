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

  // Relation to sets belonging to this expansion series
  @OneToMany(
    () => PokemonSet,
    (pokemonSet) => pokemonSet.serie,
  )
  sets: PokemonSet[];

  /** Series name and logo translations, one row per enabled locale. */
  @OneToMany(
    () => PokemonSerieTranslation,
    (translation) => translation.serie,
    { cascade: true },
  )
  translations?: PokemonSerieTranslation[];

  // --- Resolved localized properties ----------------------------------------
  // Virtual runtime properties populated dynamically from `translations` by
  // `CatalogLocalizationInterceptor` (request locale) or `CatalogLocalizationService.resolveLabels` (internal).
  // Reading these properties before calling resolution returns `undefined`.

  name?: string;
  logo?: string;
}
