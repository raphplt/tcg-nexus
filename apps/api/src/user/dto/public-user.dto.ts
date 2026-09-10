import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Public gameplay summary for a player.
 */
export class PublicPlayerDto {
  @ApiProperty({ description: "Player unique identifier", example: 42 })
  id!: number;

  @ApiProperty({
    description: "Competitive matchmaking Elo rating",
    example: 1200,
  })
  elo!: number;

  @ApiProperty({ description: "Player level", example: 5 })
  level!: number;

  @ApiProperty({ description: "Player experience points", example: 1500 })
  xp!: number;
}

/**
 * Publicly visible user profile details.
 */
export class PublicUserDto {
  @ApiProperty({ description: "User unique identifier", example: 1 })
  id!: number;

  @ApiProperty({ description: "User first name", example: "Ash" })
  firstName!: string;

  @ApiProperty({ description: "User last name", example: "Ketchum" })
  lastName!: string;

  @ApiProperty({
    description: "Avatar URL or null",
    example: "https://example.com/avatar.png",
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({ description: "Account creation timestamp" })
  createdAt!: Date;

  @ApiPropertyOptional({
    type: () => PublicPlayerDto,
    description: "Associated player stats",
  })
  player?: PublicPlayerDto;

  @ApiProperty({ description: "Total number of followers", example: 12 })
  followersCount!: number;

  @ApiProperty({ description: "Total number of users followed", example: 8 })
  followingCount!: number;

  @ApiPropertyOptional({
    description: "Whether the requesting user follows this profile",
    example: false,
  })
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
