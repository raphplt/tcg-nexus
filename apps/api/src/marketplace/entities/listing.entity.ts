import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { OrderItem } from './order-item.entity';
import { Currency } from '../../common/enums/currency';
import { Languages } from 'src/common/enums/languages';

export enum CardState {
  NM = 'NM',
  EX = 'EX',
  GD = 'GD',
  LP = 'LP',
  PL = 'PL',
  Poor = 'Poor'
}

@Entity()
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @ManyToOne(() => PokemonCard, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pokemon_card_id' })
  pokemonCard: PokemonCard;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'int', default: 1 })
  quantityAvailable: number;

  @Column({ type: 'enum', enum: CardState })
  cardState: CardState;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true, default: Languages.FR })
  language?: Languages;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.listing)
  orderItems: OrderItem[];
}
