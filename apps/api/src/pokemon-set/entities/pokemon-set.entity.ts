import { Card } from "src/card/entities/card.entity";
import { CardGame } from "src/common/enums/cardGame";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { PokemonSetTranslation } from "./pokemon-set-translation.entity";

/**
 * Objet embarqué pour le nombre de cartes dans le set
 */
export class CardCount {
  @Column({ type: "int" })
  total: number;

  @Column({ type: "int" })
  official: number;

  @Column({ type: "int" })
  reverse: number;

  @Column({ type: "int" })
  holo: number;

  @Column({ type: "int" })
  firstEd: number;
}

/**
 * Objet embarqué pour la légalité du set en compétition
 */
export class Legal {
  @Column()
  standard: boolean;

  @Column()
  expanded: boolean;
}

/**
 * Interface représentant un résumé de carte (CardBrief)
 */
export class CardBrief {
  id: string;
  image?: string;
  localId: string;
  name: string;
}

@Entity()
export class PokemonSet {
  @PrimaryColumn()
  id: string;

  @Column({ type: "enum", enum: CardGame, default: CardGame.Pokemon })
  game: CardGame;

  @Column(() => CardCount)
  cardCount: CardCount;

  @Column({ nullable: true })
  tcgOnline?: string;

  @Column()
  releaseDate: string;

  @Column(() => Legal)
  legal: Legal;

  @ManyToOne(
    () => PokemonSerie,
    (pokemonSerie) => pokemonSerie.sets,
  )
  serie: PokemonSerie;

  @OneToMany(
    () => Card,
    (card) => card.set,
    {
      cascade: true,
      onDelete: "CASCADE",
    },
  )
  cards: Card[];

  @OneToMany(
    () => SealedProduct,
    (sealedProduct) => sealedProduct.pokemonSet,
  )
  sealedProducts: SealedProduct[];

  /** Nom, logo et symbole du set, une ligne par langue activée. */
  @OneToMany(
    () => PokemonSetTranslation,
    (translation) => translation.set,
    { cascade: true },
  )
  translations?: PokemonSetTranslation[];

  // --- Resolved localized properties ----------------------------------------
  // Virtual runtime properties populated dynamically from `translations` by
  // `CatalogLocalizationInterceptor` (request locale) or `CatalogLocalizationService.resolveLabels` (internal).
  // Reading these properties before calling resolution returns `undefined`.

  name?: string;
  logo?: string;
  symbol?: string;
}
