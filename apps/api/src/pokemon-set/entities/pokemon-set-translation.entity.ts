import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { PokemonSet } from "./pokemon-set.entity";

/**
 * Name and visuals of a set, one row per language. Logo and symbol belong here:
 * TCGdex serves them per language, as it does for card images.
 */
@Entity("pokemon_set_translation")
export class PokemonSetTranslation {
  @PrimaryColumn({ name: "set_id" })
  setId: string;

  @PrimaryColumn({ type: "varchar", length: 10 })
  locale: string;

  @ManyToOne(
    () => PokemonSet,
    (set) => set.translations,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "set_id", referencedColumnName: "id" })
  set: PokemonSet;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ nullable: true })
  symbol?: string;
}
