import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CollectionItem } from 'src/collection-item/entities/collection-item.entity';

export enum CardStateCode {
  NM = 'NM', // Near Mint
  EX = 'EX', // Excellent
  GD = 'GD', // Good
  LP = 'LP', // Lightly Played
  PL = 'PL' // Played
}

@Entity('card_state')
export class CardState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: CardStateCode
  })
  code: CardStateCode;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  // Relations
  @OneToMany(() => CollectionItem, (item) => item.cardState)
  collectionItems: CollectionItem[];
}
