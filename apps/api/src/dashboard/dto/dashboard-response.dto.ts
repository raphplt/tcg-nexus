export interface DashboardCollectionData {
  totalCards: number;
  estimatedValue: number;
  recentlyAdded: number;
  collectionCount: number;
}

export interface DashboardTournamentsData {
  played: number;
  winRate: number;
  bestRank: number | null;
  totalWins: number;
  totalLosses: number;
}

export interface DashboardDecksData {
  total: number;
  mostUsed: {
    id: number;
    name: string;
    views: number;
  } | null;
}

export interface DashboardMarketplaceData {
  activeListings: number;
  totalRevenue: number;
  totalPurchases: number;
  totalSpent: number;
}

export interface DashboardBadgeItem {
  code: string;
  name: string;
  icon: string;
  category: string;
  unlockedAt: Date;
}

export interface DashboardNextBadge {
  code: string;
  name: string;
  icon: string;
  description: string;
  progress: number;
  current: number;
  threshold: number;
}

export interface DashboardBadgesData {
  unlocked: DashboardBadgeItem[];
  total: number;
  nextBadge: DashboardNextBadge | null;
}

export interface DashboardActivityDay {
  date: string;
  events: number;
}

export interface DashboardUserData {
  memberSince: Date;
  isActive: boolean;
}

export interface DashboardResponseDto {
  collection: DashboardCollectionData;
  tournaments: DashboardTournamentsData;
  decks: DashboardDecksData;
  marketplace: DashboardMarketplaceData;
  badges: DashboardBadgesData;
  activity: DashboardActivityDay[];
  user: DashboardUserData;
}
