import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-sery.entity';
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
  // Identifiant unique du set
  @PrimaryColumn()
  id: string;

  // Nom du set
  @Column()
  name: string;

  // Logo du set (asset, nullable)
  @Column({ nullable: true })
  logo?: string;

  // Symbole du set (asset, nullable)
  @Column({ nullable: true })
  symbol?: string;

  // Information sur le nombre de cartes du set
  @Column(() => CardCount)
  cardCount: CardCount;

  // Code du set pour Pokémon TCG Online (nullable)
  @Column({ nullable: true })
  tcgOnline?: string;

  // Date de sortie du set (format yyyy-mm-dd)
  @Column()
  releaseDate: string;

  // Légalité du set pour les compétitions
  @Column(() => Legal)
  legal: Legal;

  // Relation vers la série du set
  @ManyToOne(() => PokemonSerie, (pokemonSerie) => pokemonSerie.sets)
  serie: PokemonSerie;

  // Relation vers les cartes du set
  @OneToMany(() => PokemonCard, (pokemonCard) => pokemonCard.set)
  cards: PokemonCard[];
}
