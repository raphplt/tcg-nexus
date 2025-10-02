import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn
} from 'typeorm';
import { Collection } from 'src/collection/entities/collection.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { CardState } from 'src/card-state/entities/card-state.entity';

@Entity('collection_item')
export class CollectionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Collection, (collection) => collection.items, {
    onDelete: 'CASCADE'
  })
  collection: Collection;

  @ManyToOne(() => PokemonCard, (pokemonCard) => pokemonCard.collectionItems, {
    eager: true
  })
  pokemonCard: PokemonCard;

  @ManyToOne(() => CardState, (cardState) => cardState.collectionItems, {
    eager: true
  })
  cardState: CardState;

  @CreateDateColumn({ type: 'timestamp' })
  added_at: Date;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
