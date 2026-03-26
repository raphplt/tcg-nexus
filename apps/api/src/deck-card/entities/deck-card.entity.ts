import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Deck } from 'src/deck/entities/deck.entity';
import { Card } from 'src/card/entities/card.entity';
import { DeckCardRole } from '../../common/enums/deckCardRole';

@Entity()
export class DeckCard {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Deck, (deck) => deck.cards, { onDelete: 'CASCADE' })
  deck: Deck;

  @ManyToOne(() => Card, (card) => card.deckCards, {
    eager: true,
    onDelete: 'CASCADE'
  })
  card: Card;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({ type: 'enum', enum: DeckCardRole, default: DeckCardRole.main })
  role: DeckCardRole;
}
