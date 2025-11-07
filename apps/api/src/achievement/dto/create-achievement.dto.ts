import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { AchievementType, AchievementCategory } from '../entities/achievement.entity';

export class CreateAchievementDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  icon: string;

  @IsEnum(AchievementType)
  type: AchievementType;

  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @IsNumber()
  @Min(1)
  @IsOptional()
  target?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

