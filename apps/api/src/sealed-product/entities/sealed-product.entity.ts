import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { SealedProductType } from "../enums/sealed-product-type.enum";
import { SealedProductLocale } from "./sealed-product-locale.entity";

/**
 * Detailed contents of a sealed product.
 * E.g.: { boosterCount: 8, promos: ["sv4-12"], accessories: true }
 */
export interface SealedProductContents {
  boosterCount?: number;
  promos?: string[];
  accessories?: boolean;
  [key: string]: unknown;
}

@Entity()
@Index(["productType"])
@Index(["pokemonSet", "productType"])
export class SealedProduct {
  /** Stable slug, e.g. "sv04-etb-001" */
  @PrimaryColumn()
  id: string;

  @Column({ type: "enum", enum: SealedProductType })
  productType: SealedProductType;

  @ManyToOne(
    () => PokemonSet,
    (set) => set.sealedProducts,
    {
      nullable: true,
      onDelete: "SET NULL",
    },
  )
  @JoinColumn({ name: "pokemon_set_id" })
  pokemonSet?: PokemonSet | null;

  @Column({ type: "jsonb", nullable: true })
  contents?: SealedProductContents | null;

  @Column({ nullable: true })
  @Index()
  sku?: string;

  @Column({ nullable: true })
  @Index()
  upc?: string;

  /**
   * Relative path in the R2 bucket (without the base URL).
   * E.g.: "pokecardex/AQ/Booster_Aquapolis_Arcanin.png"
   *
   * NOTE: packaging is translated in reality, but Pokécardex only publishes
   * the French artwork and no English source exists. The image stays on the
   * language-neutral entity until one does.
   */
  @Column({ nullable: true })
  image?: string;

  @OneToMany(
    () => SealedProductLocale,
    (locale) => locale.sealedProduct,
    {
      cascade: true,
    },
  )
  locales: SealedProductLocale[];

  @OneToMany(
    () => CollectionItem,
    (collectionItem) => collectionItem.sealedProduct,
  )
  collectionItems: CollectionItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
