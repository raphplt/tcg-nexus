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

  /** Physical finish/variant (e.g. normal, holo, reverse, firstEdition). */
  @Column({ type: "varchar", length: 50, nullable: true })
  variant?: string | null;

  /** Item language (e.g. fr, en, ja). */
  @Column({ type: "varchar", length: 10, nullable: true, default: "fr" })
  language?: string | null;

  /** Edition/printing specification (e.g. 1st_edition, unlimited, promo). */
  @Column({ type: "varchar", length: 50, nullable: true })
  printing?: string | null;

  /** Date when physical item was acquired. */
  @Column({ type: "timestamp with time zone", nullable: true })
  acquiredAt?: Date | null;

  /** Purchase / acquisition cost. */
  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  acquisitionCost?: number | null;

  /** Acquisition currency (e.g. EUR, USD). */
  @Column({ type: "varchar", length: 10, nullable: true })
  acquisitionCurrency?: string | null;

  /** Physical storage location (e.g. Binder 1, Toploader Box A). */
  @Column({ type: "varchar", length: 255, nullable: true })
  storageLocation?: string | null;

  /** User notes and condition remarks. */
  @Column({ type: "text", nullable: true })
  notes?: string | null;

  /** Real item photo URLs. */
  @Column({ type: "jsonb", nullable: true })
  photoUrls?: string[] | null;

  /** Quantity available for decks or marketplace listing. */
  @Column({ type: "int", default: 1 })
  quantityAvailable: number;

  /** Quantity currently committed/reserved in active marketplace listings. */
  @Column({ type: "int", default: 0 })
  quantityReserved: number;

  /** Quantity fulfilled/sold through marketplace or trade. */
  @Column({ type: "int", default: 0 })
  quantitySold: number;

  /** Provenance tracking (e.g. import operation ID, order line receipt). */
  @Column({ type: "jsonb", nullable: true })
  provenance?: Record<string, any> | null;
}
