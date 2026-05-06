// apps/api/src/user/dto/public-user.dto.ts
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

  static fromEntities(
    user: { id: number; firstName: string; lastName: string; avatarUrl: string | null; createdAt: Date },
    player: { id: number; elo: number; level: number; xp: number } | null,
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
    return dto;
  }
}
