import { Card } from "src/card/entities/card.entity";
import { CardState } from "src/card-state/entities/card-state.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("collection_item")
@Index(["productKind"])
export class CollectionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Collection,
    (collection) => collection.items,
    {
      onDelete: "CASCADE",
    },
  )
  collection: Collection;

  /**
   * Discriminator : indique si cet item référence une carte ou un produit scellé.
   * Exactement un de `pokemonCard` / `sealedProduct` doit être renseigné.
   */
  @Column({ type: "enum", enum: ProductKind, default: ProductKind.CARD })
  productKind: ProductKind;

  @ManyToOne(
    () => Card,
    (pokemonCard) => pokemonCard.collectionItems,
    {
      eager: true,
      nullable: true,
      onDelete: "CASCADE",
    },
  )
  pokemonCard?: Card | null;

  @ManyToOne(
    () => SealedProduct,
    (sealedProduct) => sealedProduct.collectionItems,
    {
      eager: true,
      nullable: true,
      onDelete: "CASCADE",
    },
  )
  sealedProduct?: SealedProduct | null;

  /** État de la carte (NM, EX, ...). Nullable pour les produits scellés. */
  @ManyToOne(
    () => CardState,
    (cardState) => cardState.collectionItems,
    {
      eager: true,
      nullable: true,
    },
  )
  cardState?: CardState | null;

  /** État du produit scellé. Nullable pour les cartes. */
  @Column({ type: "enum", enum: SealedCondition, nullable: true })
  sealedCondition?: SealedCondition | null;

  @CreateDateColumn({ type: "timestamp" })
  added_at: Date;

  @Column({ type: "int", default: 1 })
  quantity: number;
}
