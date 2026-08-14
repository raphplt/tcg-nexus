import { Card } from "src/card/entities/card.entity";
import { Deck } from "src/deck/entities/deck.entity";
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DeckCardRole } from "../../common/enums/deckCardRole";

@Entity()
@Index("IDX_deck_card_deck_id", ["deck"])
@Index("IDX_deck_card_deck_card", ["deck", "card"])
export class DeckCard {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Deck, (deck) => deck.cards, { onDelete: "CASCADE" })
  deck: Deck;

  @ManyToOne(() => Card, (card) => card.deckCards, {
    eager: true,
    onDelete: "CASCADE",
  })
  card: Card;

  @Column({ type: "int", default: 1 })
  qty: number;

  @Column({ type: "enum", enum: DeckCardRole, default: DeckCardRole.main })
  role: DeckCardRole;
}
