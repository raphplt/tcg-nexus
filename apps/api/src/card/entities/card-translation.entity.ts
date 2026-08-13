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
 * Champs d'une carte qui dépendent de la langue.
 *
 * Aucune langue n'est canonique : `card` porte les données non linguistiques
 * (identifiants, hp, types, prix, légalité…) et chaque langue activée a sa
 * ligne ici. Ajouter une langue n'a donc aucun effet sur les autres.
 *
 * `image` en fait partie : le texte de la carte est imprimé sur l'illustration,
 * TCGdex sert bien une image par langue (`assets.tcgdex.net/<locale>/…`).
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

  /** Date `updated` de la carte chez TCGdex, pour cette langue. */
  @Column({ name: "source_updated_at", nullable: true })
  sourceUpdatedAt?: string;
}
