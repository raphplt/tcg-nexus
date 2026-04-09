import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { SealedProduct } from "./sealed-product.entity";

@Entity()
@Unique(["sealedProduct", "locale"])
export class SealedProductLocale {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => SealedProduct,
    (product) => product.locales,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "sealed_product_id" })
  sealedProduct: SealedProduct;

  /** Code de langue ex : "fr", "en", "ja", "de" */
  @Column()
  @Index()
  locale: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
