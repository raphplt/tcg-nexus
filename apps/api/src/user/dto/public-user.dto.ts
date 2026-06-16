export class PublicPlayerDto {
  id!: number;
  elo!: number;
  level!: number;
  xp!: number;
}

export class PublicUserDto {
  id!: number;
  firstName!: string;
  lastName!: string;
  avatarUrl!: string | null;
  createdAt!: Date;
  player?: PublicPlayerDto;
  followersCount!: number;
  followingCount!: number;
  isFollowing?: boolean;

  static fromEntities(
    user: {
      id: number;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      createdAt: Date;
    },
    player: { id: number; elo: number; level: number; xp: number } | null,
    extras: {
      followersCount?: number;
      followingCount?: number;
      isFollowing?: boolean;
    } = {},
  ): PublicUserDto {
    const dto = new PublicUserDto();
    dto.id = user.id;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.avatarUrl = user.avatarUrl;
    dto.createdAt = user.createdAt;
    if (player) {
      const p = new PublicPlayerDto();
      p.id = player.id;
      p.elo = player.elo;
      p.level = player.level;
      p.xp = player.xp;
      dto.player = p;
    }
    dto.followersCount = extras.followersCount ?? 0;
    dto.followingCount = extras.followingCount ?? 0;
    if (typeof extras.isFollowing === "boolean") {
      dto.isFollowing = extras.isFollowing;
    }
    return dto;
  }
}
