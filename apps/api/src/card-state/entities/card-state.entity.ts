import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CollectionItem } from "../../collection-item/entities/collection-item.entity";

/**
 * Standard industry grading condition codes for physical cards.
 */
export enum CardStateCode {
  /** Near Mint - Minimal to no visible wear. */
  NM = "NM",
  /** Excellent - Slight edge wear or minor surface scratches. */
  EX = "EX",
  /** Good - Visible wear, corner scuffing, but no severe creasing. */
  GD = "GD",
  /** Lightly Played - Notable surface and border wear from tournament play. */
  LP = "LP",
  /** Played - Heavy border wear, potential small creases, whitening. */
  PL = "PL",
  /** Poor - Major creases, tears, water damage, or structural defects. */
  Poor = "Poor",
}

/**
 * Entity representing a card physical condition classification.
 */
@Entity("card_state")
export class CardState {
  @ApiProperty({
    description: "Unique auto-incremented identifier for the card state",
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Standard card grading condition code",
    enum: CardStateCode,
    example: CardStateCode.NM,
  })
  @Column({
    type: "enum",
    enum: CardStateCode,
  })
  code: CardStateCode;

  @ApiProperty({
    description: "Descriptive label for the condition grade",
    example: "Near Mint",
  })
  @Column({ type: "varchar", length: 255 })
  label: string;

  @OneToMany(
    () => CollectionItem,
    (item) => item.cardState,
  )
  collectionItems: CollectionItem[];
}
