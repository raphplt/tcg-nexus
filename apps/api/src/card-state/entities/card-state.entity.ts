import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export enum CardStateCode {
  NM = "NM", // Near Mint
  EX = "EX", // Excellent
  GD = "GD", // Good
  LP = "LP", // Lightly Played
  PL = "PL", // Played
  Poor = "Poor", // Poor
}

@Entity("card_state")
export class CardState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: CardStateCode,
  })
  code: CardStateCode;

  @Column({ type: "varchar", length: 255 })
  label: string;

  // Relations
  @OneToMany(
    () => CollectionItem,
    (item) => item.cardState,
  )
  collectionItems: CollectionItem[];
}
