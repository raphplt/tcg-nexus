export enum AchievementType {
  // Account
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

  // Tournaments
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
  COLLECTOR_BEGINNER = 'collector_beginner',
  COLLECTOR_INTERMEDIATE = 'collector_intermediate',
  COLLECTOR_ADVANCED = 'collector_advanced',
  COLLECTOR_EXPERT = 'collector_expert',
  COLLECTOR_MASTER = 'collector_master'
}

export enum AchievementCategory {
  ACCOUNT = 'account',
  MARKETPLACE = 'marketplace',
  DECK = 'deck',
  TOURNAMENT = 'tournament',
  MATCH = 'match',
  COLLECTION = 'collection'
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  category: AchievementCategory;
  target: number;
  points: number;
  isSecret: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievement {
  id: number;
  userId: number;
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progressPercentage?: number;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  unlockedPercentage: number;
  totalPoints: number;
}

