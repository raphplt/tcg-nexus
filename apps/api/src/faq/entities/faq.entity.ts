import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

export enum FaqCategory {
  TOURNAMENTS = 'Tournois',
  COLLECTION = 'Collection',
  MARKETPLACE = 'Marketplace',
  DECKS = 'Decks',
  ACCOUNT = 'Compte'
}

@Entity({ name: 'faq' })
export class Faq {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'varchar', length: 50 })
  category: FaqCategory;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
