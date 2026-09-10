import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { Card } from "./card.entity";
import type {
  PokemonAbility,
  PokemonAttack,
} from "./pokemon-card-details.entity";

/**
 * Language-dependent fields of a card.
 *
 * No language is canonical: `card` holds the non-linguistic data
 * (identifiers, hp, types, prices, legality…) and each enabled language has its
 * own row here. Adding a language therefore has no effect on the others.
 *
 * `image` is one of them: the card text is printed on the artwork, and
 * TCGdex does serve one image per language (`assets.tcgdex.net/<locale>/…`).
 */
@Entity("card_translation")
@Index(["locale", "name"])
export class CardTranslation {
  @PrimaryColumn("uuid", { name: "card_id" })
  cardId: string;

  @PrimaryColumn({ type: "varchar", length: 10 })
  locale: string;

  @ManyToOne(
    () => Card,
    (card) => card.translations,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "card_id", referencedColumnName: "id" })
  card: Card;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  rarity?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "text", nullable: true })
  effect?: string;

  @Column({ name: "evolve_from", nullable: true })
  evolveFrom?: string;

  @Column({ nullable: true })
  stage?: string;

  @Column({ nullable: true })
  suffix?: string;

  @Column({ type: "jsonb", nullable: true })
  item?: { name: string; effect: string };

  @Column({ type: "jsonb", nullable: true })
  abilities?: PokemonAbility[];

  @Column({ type: "jsonb", nullable: true })
  attacks?: PokemonAttack[];

  /** TCGdex `updated` date of the card, for this language. */
  @Column({ name: "source_updated_at", nullable: true })
  sourceUpdatedAt?: string;
}
