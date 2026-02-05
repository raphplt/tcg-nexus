import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index
} from 'typeorm';
import { Card } from 'src/card/entities/card.entity';
import { User } from 'src/user/entities/user.entity';

export enum CardEventType {
  VIEW = 'view',
  SEARCH = 'search',
  FAVORITE = 'favorite',
  ADD_TO_CART = 'add_to_cart',
  SALE = 'sale'
}

@Entity('card_events')
@Index(['card', 'createdAt'])
@Index(['card', 'eventType', 'createdAt'])
@Index(['createdAt'])
export class CardEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Card, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ type: 'enum', enum: CardEventType })
  eventType: CardEventType;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  context?: {
    searchQuery?: string;
    referrer?: string;
    listingId?: number;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;
}
