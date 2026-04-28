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
 * Contenu détaillé d'un produit scellé.
 * Ex : { boosterCount: 8, promos: ["sv4-12"], accessories: true }
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
  /** Slug stable, ex : "sv04-etb-001" */
  @PrimaryColumn()
  id: string;

  @Column()
  @Index()
  nameEn: string;

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
   * Chemin relatif dans le bucket R2 (sans le base URL).
   * Ex : "pokecardex/AQ/Booster_Aquapolis_Arcanin.png"
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
