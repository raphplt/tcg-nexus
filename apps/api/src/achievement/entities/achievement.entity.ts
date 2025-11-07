import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementType {
  // Compte et profil
  ACCOUNT_CREATED = 'account_created',
  PROFILE_COMPLETED = 'profile_completed',

  // Marketplace
  FIRST_CARD_BOUGHT = 'first_card_bought',
  FIRST_CARD_LISTED = 'first_card_listed',
  FIRST_SALE = 'first_sale',
  CARDS_BOUGHT_10 = 'cards_bought_10',
  CARDS_BOUGHT_50 = 'cards_bought_50',
  CARDS_BOUGHT_100 = 'cards_bought_100',
  CARDS_SOLD_10 = 'cards_sold_10',
  CARDS_SOLD_50 = 'cards_sold_50',
  CARDS_SOLD_100 = 'cards_sold_100',

  // Decks
  FIRST_DECK_CREATED = 'first_deck_created',
  DECKS_CREATED_5 = 'decks_created_5',
  DECKS_CREATED_10 = 'decks_created_10',
  DECKS_CREATED_25 = 'decks_created_25',

  // Tournois
  FIRST_TOURNAMENT_JOINED = 'first_tournament_joined',
  FIRST_TOURNAMENT_WIN = 'first_tournament_win',
  TOURNAMENTS_JOINED_5 = 'tournaments_joined_5',
  TOURNAMENTS_JOINED_10 = 'tournaments_joined_10',
  TOURNAMENTS_JOINED_25 = 'tournaments_joined_25',
  TOURNAMENTS_WON_3 = 'tournaments_won_3',
  TOURNAMENTS_WON_5 = 'tournaments_won_5',
  TOURNAMENTS_WON_10 = 'tournaments_won_10',

  // Matches
  FIRST_MATCH_WIN = 'first_match_win',
  MATCHES_WON_10 = 'matches_won_10',
  MATCHES_WON_50 = 'matches_won_50',
  MATCHES_WON_100 = 'matches_won_100',

  // Collection
  COLLECTOR_BEGINNER = 'collector_beginner', // 10 cartes
  COLLECTOR_INTERMEDIATE = 'collector_intermediate', // 50 cartes
  COLLECTOR_ADVANCED = 'collector_advanced', // 100 cartes
  COLLECTOR_EXPERT = 'collector_expert', // 500 cartes
  COLLECTOR_MASTER = 'collector_master' // 1000 cartes
}

export enum AchievementCategory {
  ACCOUNT = 'account',
  MARKETPLACE = 'marketplace',
  DECK = 'deck',
  TOURNAMENT = 'tournament',
  MATCH = 'match',
  COLLECTION = 'collection'
}

@Entity()
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // Code unique pour identifier l'achievement

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  icon: string; // URL ou emoji de l'icône

  @Column({
    type: 'enum',
    enum: AchievementType
  })
  type: AchievementType;

  @Column({
    type: 'enum',
    enum: AchievementCategory
  })
  category: AchievementCategory;

  @Column({ default: 1 })
  target: number; // Valeur cible pour les achievements progressifs (ex: 10 pour "10 tournois")

  @Column({ default: 0 })
  points: number; // Points gagnés pour cet achievement (gamification)

  @Column({ default: false })
  isSecret: boolean; // Pour les achievements secrets

  @Column({ default: true })
  isActive: boolean; // Pour activer/désactiver des achievements

  @OneToMany(() => UserAchievement, (userAchievement) => userAchievement.achievement)
  userAchievements: UserAchievement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

