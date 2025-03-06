import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm';

/**
 * Objet embarqué pour le nombre de cartes dans le set
 */
export class CardCount {
  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'int' })
  official: number;

  @Column({ type: 'int' })
  reverse: number;

  @Column({ type: 'int' })
  holo: number;

  @Column({ type: 'int' })
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

  @Column()
  name: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ nullable: true })
  symbol?: string;

  @Column(() => CardCount)
  cardCount: CardCount;

  @Column({ nullable: true })
  tcgOnline?: string;

  @Column()
  releaseDate: string;

  @Column(() => Legal)
  legal: Legal;

  @ManyToOne(() => PokemonSerie, (pokemonSerie) => pokemonSerie.sets)
  serie: PokemonSerie;

  @OneToMany(() => PokemonCard, (pokemonCard) => pokemonCard.set, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  cards: PokemonCard[];
}
