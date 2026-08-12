import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { PokemonSerie } from "./pokemon-serie.entity";

/** Nom et logo d'une série par langue. */
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
