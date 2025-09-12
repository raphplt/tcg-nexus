import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany
} from 'typeorm';
import { EnergyType } from 'src/common/enums/energyType';
import { PokemonCardsType } from 'src/common/enums/pokemonCardsType';
import { TrainerType } from 'src/common/enums/trainerType';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { CollectionItem } from 'src/collection-item/entities/collection-item.entity';

@Entity()
export class PokemonCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tcgDexId: string;

  @Column({ nullable: true })
  localId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  category: PokemonCardsType;

  @Column({ nullable: true })
  illustrator?: string;

  @Column({ nullable: true })
  rarity?: string;

  @Column({ type: 'jsonb', nullable: true })
  variants: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
  };

  @ManyToOne(() => PokemonSet, (pokemonSet) => pokemonSet.cards)
  set: PokemonSet;

  @Column({ type: 'int', array: true, nullable: true })
  dexId?: number[];

  @Column({ type: 'int', nullable: true })
  hp?: number;

  @Column('text', { array: true, nullable: true })
  types?: string[];

  @Column({ nullable: true })
  evolveFrom?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  level?: string;

  @Column({ nullable: true })
  stage?: string;

  @Column({ nullable: true })
  suffix?: string;

  @Column({ type: 'jsonb', nullable: true })
  item?: {
    name: string;
    effect: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  attacks?: {
    cost: string[];
    name: string;
    effect: string;
    damage?: number;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  weaknesses?: {
    type: string;
    value: string;
  }[];

  @Column({ type: 'int', nullable: true })
  retreat?: number;

  @Column({ nullable: true })
  regulationMark?: string;

  @Column({ type: 'jsonb', nullable: true })
  legal?: {
    standard: boolean;
    expanded: boolean;
  };

  @Column({ nullable: true })
  updated?: string;

  // Champs spécifiques aux cartes Trainer et Energy
  @Column({ type: 'text', nullable: true })
  effect?: string;

  @Column({ nullable: true })
  trainerType?: TrainerType;

  @Column({ nullable: true })
  energyType?: EnergyType;

  @OneToMany(() => DeckCard, (deckCard) => deckCard.card)
  deckCards: DeckCard[];

  // Relation avec CollectionItem
  @OneToMany(
    () => CollectionItem,
    (collectionItem) => collectionItem.pokemonCard
  )
  collectionItems: CollectionItem[];
}
