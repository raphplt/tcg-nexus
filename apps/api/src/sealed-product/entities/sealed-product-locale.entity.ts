import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { SealedProduct } from "./sealed-product.entity";

/**
 * Localized name of a sealed product, one row per language.
 *
 * Keyed by (product, locale) like `card_translation`: the product identifier
 * is enough to reach a name, so no generated id is needed.
 */
@Entity()
@Index(["locale", "name"])
export class SealedProductLocale {
  @PrimaryColumn({ name: "sealed_product_id" })
  sealedProductId: string;

  /** Language code, e.g. "fr", "en". */
  @PrimaryColumn({ type: "varchar", length: 10 })
  locale: string;

  @Column()
  name: string;

  @ManyToOne(
    () => SealedProduct,
    (product) => product.locales,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "sealed_product_id", referencedColumnName: "id" })
  sealedProduct: SealedProduct;

  @CreateDateColumn()
  createdAt: Date;
}
