export interface PublicPlayer {
  id: number;
  elo: number;
  level: number;
  xp: number;
}

export interface PublicUser {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  createdAt: string;
  player?: PublicPlayer;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface PublicUserBadge {
  id: number;
  unlockedAt: string;
  badge: {
    id: number;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: string;
  };
}
