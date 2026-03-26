import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { CardGame } from 'src/common/enums/cardGame';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { CollectionItem } from 'src/collection-item/entities/collection-item.entity';
import { PokemonCardDetails } from './pokemon-card-details.entity';

export type CardVariants = {
  normal?: boolean;
  reverse?: boolean;
  holo?: boolean;
  firstEdition?: boolean;
  wPromo?: boolean;
  [key: string]: boolean | undefined;
};

export type CardVariantDetail = {
  type?: string;
  size?: string;
  foil?: string;
  stamp?: string;
  subtype?: string;
};

export type TcgPlayerVariantPricing = {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
};

export type TcgPlayerPricing = {
  unit: string;
  updated: string;
  normal?: TcgPlayerVariantPricing;
  holofoil?: TcgPlayerVariantPricing;
  reverseHolofoil?: TcgPlayerVariantPricing;
  '1stEditionHolofoil'?: TcgPlayerVariantPricing;
  '1stEditionNormal'?: TcgPlayerVariantPricing;
};

export type CardMarketPricing = {
  unit: string;
  updated: string;
  idProduct: number;
  avg: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  low: number | null;
  trend: number | null;
  'avg-holo': number | null;
  'avg1-holo': number | null;
  'avg7-holo': number | null;
  'avg30-holo': number | null;
  'low-holo': number | null;
  'trend-holo': number | null;
};

export type CardPricingData = {
  tcgplayer?: TcgPlayerPricing | null;
  cardmarket?: CardMarketPricing | null;
};

@Entity('card')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CardGame, default: CardGame.Pokemon })
  game: CardGame;

  @Column({ nullable: true })
  tcgDexId?: string;

  @Column({ nullable: true })
  localId?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  illustrator?: string;

  @Column({ nullable: true })
  rarity?: string;

  @Column({ type: 'jsonb', nullable: true })
  variants?: CardVariants;

  @Column({ type: 'jsonb', nullable: true })
  variantsDetailed?: CardVariantDetail[];

  @ManyToOne(() => PokemonSet, (pokemonSet) => pokemonSet.cards)
  set: PokemonSet;

  @Column({ type: 'jsonb', nullable: true })
  legal?: {
    standard: boolean;
    expanded: boolean;
  };

  @Column({ nullable: true })
  updated?: string;

  @Column({ type: 'jsonb', nullable: true })
  pricing?: CardPricingData;

  @OneToOne(() => PokemonCardDetails, (details) => details.card, {
    cascade: true
  })
  pokemonDetails?: PokemonCardDetails;

  @OneToMany(() => DeckCard, (deckCard) => deckCard.card)
  deckCards: DeckCard[];

  @OneToMany(
    () => CollectionItem,
    (collectionItem) => collectionItem.pokemonCard
  )
  collectionItems: CollectionItem[];
}
