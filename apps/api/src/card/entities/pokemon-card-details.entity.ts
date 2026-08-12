import { EnergyType } from "src/common/enums/energyType";
import { PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { TrainerType } from "src/common/enums/trainerType";
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Card } from "./card.entity";

export type PokemonAbility = {
  type?: string;
  name?: string;
  effect?: string;
};

export type PokemonAttack = {
  cost: string[];
  name: string;
  effect?: string;
  damage?: string | number;
};

export type PokemonWeaknessResistance = {
  type: string;
  value: string;
};

/**
 * Données de jeu d'une carte, identiques dans toutes les langues : points de
 * vie, types, faiblesses, coût de retraite…
 *
 * Les champs traduits — description, effet, capacités, attaques, niveau
 * d'évolution — vivent dans `card_translation`.
 */
@Entity()
export class PokemonCardDetails {
  @PrimaryColumn("uuid", { name: "card_id" })
  cardId: string;

  @OneToOne(
    () => Card,
    (card) => card.pokemonDetails,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "card_id", referencedColumnName: "id" })
  card: Card;

  @Column({ type: "enum", enum: PokemonCardsType, nullable: true })
  category?: PokemonCardsType;

  @Column({ type: "int", array: true, nullable: true })
  dexId?: number[];

  @Column({ type: "int", nullable: true })
  hp?: number;

  @Column("text", { array: true, nullable: true })
  types?: string[];

  @Column({ nullable: true })
  level?: string;

  @Column({ type: "jsonb", nullable: true })
  weaknesses?: PokemonWeaknessResistance[];

  @Column({ type: "jsonb", nullable: true })
  resistances?: PokemonWeaknessResistance[];

  @Column({ type: "int", nullable: true })
  retreat?: number;

  @Column({ nullable: true })
  regulationMark?: string;

  @Column({ nullable: true })
  trainerType?: TrainerType;

  @Column({ nullable: true })
  energyType?: EnergyType;

  @Column({ type: "jsonb", nullable: true })
  boosters?: {
    id?: string;
    name?: string;
  }[];

  /**
   * Effets parsés par l'effect-parser.
   * Peuplé via `npm run sync:effects` dans apps/api.
   * Structure : SupportedCardDefinition (kind + attacks/playEffects/passiveEffects…)
   */
  @Column({ type: "jsonb", nullable: true })
  parsedEffects?: Record<string, unknown> | null;

  // --- Resolved localized properties ----------------------------------------
  // Virtual runtime properties populated dynamically from `translations` by
  // `CatalogLocalizationInterceptor` (request locale) or `CatalogLocalizationService.resolveLabels` (internal).
  // Reading these properties before calling resolution returns `undefined`.

  description?: string;
  effect?: string;
  evolveFrom?: string;
  stage?: string;
  suffix?: string;
  item?: { name: string; effect: string };
  abilities?: PokemonAbility[];
  attacks?: PokemonAttack[];
}
