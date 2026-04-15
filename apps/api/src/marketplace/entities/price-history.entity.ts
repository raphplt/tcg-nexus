import { Card } from "src/card/entities/card.entity";
import { Currency } from "src/common/enums/currency";
import { CardState } from "src/common/enums/pokemonCardsType";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["pokemonCard", "recordedAt"])
@Index(["pokemonCard", "cardState", "currency"])
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Card, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "card_id" })
  pokemonCard: Card;

  @Column("decimal", { precision: 10, scale: 2 })
  price: number;

  @Column({ type: "enum", enum: Currency })
  currency: Currency;

  @Column({ type: "enum", enum: CardState, nullable: true })
  cardState?: CardState;

  @Column({ type: "int", default: 1 })
  quantityAvailable: number;

  @CreateDateColumn()
  recordedAt: Date;
}
