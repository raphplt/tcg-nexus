import { Card } from "src/card/entities/card.entity";
import { Currency } from "src/common/enums/currency";
import { CardState } from "src/common/enums/pokemonCardsType";
import { PriceSource } from "src/common/enums/price-source";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
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
@Index(["sealedProduct", "recordedAt"])
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Soit `pokemonCard`, soit `sealedProduct` est renseigné (jamais les deux).
   */
  @ManyToOne(() => Card, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "card_id" })
  pokemonCard?: Card | null;

  @ManyToOne(() => SealedProduct, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "sealed_product_id" })
  sealedProduct?: SealedProduct | null;

  @Column("decimal", { precision: 10, scale: 2 })
  price: number;

  @Column({ type: "enum", enum: Currency })
  currency: Currency;

  @Column({ type: "enum", enum: CardState, nullable: true })
  cardState?: CardState;

  @Column({ type: "enum", enum: SealedCondition, nullable: true })
  sealedCondition?: SealedCondition;

  @Column({ type: "int", default: 1 })
  quantityAvailable: number;

  /**
   * Origine du prix enregistré : offre interne ou snapshot d'une source
   * externe (CardMarket, TCGPlayer). Permet de filtrer les courbes côté front.
   */
  @Column({ type: "enum", enum: PriceSource, default: PriceSource.LISTING })
  source: PriceSource;

  @CreateDateColumn()
  recordedAt: Date;
}
