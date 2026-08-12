import { Card } from "src/card/entities/card.entity";
import { Languages } from "src/common/enums/languages";
import { ListingStatus } from "src/common/enums/listing-status";
import { CardState } from "src/common/enums/pokemonCardsType";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import { CartItem } from "src/user_cart/entities/cart-item.entity";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Currency } from "../../common/enums/currency";
import { OrderItem } from "./order-item.entity";

@Entity()
@Index(["price"])
@Index(["expiresAt", "quantityAvailable"])
@Index(["pokemonCard", "currency", "cardState"])
@Index(["sealedProduct", "currency"])
@Index(["productKind"])
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "seller_id" })
  seller: User;

  /**
   * Discriminator field. Exactly one of `pokemonCard` or `sealedProduct` must be set.
   */
  @Column({ type: "enum", enum: ProductKind, default: ProductKind.CARD })
  productKind: ProductKind;

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

  @Column({ type: "int", default: 1 })
  quantityAvailable: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: "int", default: 3 })
  handlingTimeDays: number;

  @Column({
    type: "enum",
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  /** Card condition state code. Nullable for sealed product listings. */
  @Column({ type: "enum", enum: CardState, nullable: true })
  cardState?: CardState | null;

  /** Sealed product condition. Nullable for card listings. */
  @Column({ type: "enum", enum: SealedCondition, nullable: true })
  sealedCondition?: SealedCondition | null;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true, default: Languages.FR })
  language?: Languages;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(
    () => OrderItem,
    (orderItem) => orderItem.listing,
  )
  orderItems: OrderItem[];

  @OneToMany(
    () => CartItem,
    (cartItem) => cartItem.listing,
  )
  cartItems: CartItem[];
}
