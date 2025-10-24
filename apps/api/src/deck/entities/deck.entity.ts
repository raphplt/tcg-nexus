import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { DeckFormat } from 'src/deck-format/entities/deck-format.entity';

@Entity()
export class Deck {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.decks, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 100 })
  name: string;

  @Column({ default: false })
  isPublic: boolean;

  @ManyToOne(() => DeckFormat, (format) => format.decks, {
    eager: true,
    onDelete: 'SET NULL'
  })
  format: DeckFormat;

  @OneToMany(() => DeckCard, (deckCard) => deckCard.deck, { cascade: true })
  cards?: DeckCard[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
