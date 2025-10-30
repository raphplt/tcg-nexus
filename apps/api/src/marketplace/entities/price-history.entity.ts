import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index
} from 'typeorm';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { Currency } from 'src/common/enums/currency';
import { CardState } from './listing.entity';

@Entity()
@Index(['pokemonCard', 'recordedAt'])
@Index(['pokemonCard', 'cardState', 'currency'])
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PokemonCard, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pokemon_card_id' })
  pokemonCard: PokemonCard;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'enum', enum: CardState, nullable: true })
  cardState?: CardState;

  @Column({ type: 'int', default: 1 })
  quantityAvailable: number;

  @CreateDateColumn()
  recordedAt: Date;
}
