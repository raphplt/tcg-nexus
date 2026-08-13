import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { PokemonSerie } from "./pokemon-serie.entity";

/** Name and logo of a series, one row per language. */
@Entity("pokemon_serie_translation")
export class PokemonSerieTranslation {
  @PrimaryColumn({ name: "serie_id" })
  serieId: string;

  @PrimaryColumn({ type: "varchar", length: 10 })
  locale: string;

  @ManyToOne(
    () => PokemonSerie,
    (serie) => serie.translations,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "serie_id", referencedColumnName: "id" })
  serie: PokemonSerie;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  logo?: string;
}
