import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from 'typeorm';
import { Card } from 'src/card/entities/card.entity';

@Entity('card_popularity_metrics')
@Unique(['card', 'date'])
@Index(['card', 'date'])
@Index(['date'])
@Index(['popularityScore'])
@Index(['trendScore'])
export class CardPopularityMetrics {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Card, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ type: 'date' })
  date: Date;

  // Compteurs d'événements pour la journée
  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  searches: number;

  @Column({ type: 'int', default: 0 })
  favorites: number;

  @Column({ type: 'int', default: 0 })
  addsToCart: number;

  @Column({ type: 'int', default: 0 })
  sales: number;

  // Métriques marketplace
  @Column({ type: 'int', default: 0 })
  listingCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  avgPrice: number;

  // Scores calculés
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  popularityScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  trendScore: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
