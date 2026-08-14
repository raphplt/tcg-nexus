import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export const MIN_ROUND_COUNT = 1;
export const MAX_ROUND_COUNT = 20;

export const MAX_GUESS = 1_000_000;

export enum MiniGameType {
  CASE_OPENING = "case_opening",
  JUSTE_PRIX = "juste_prix",
}

export class JoinQueueParamsDto {
  @IsOptional()
  @IsString()
  setId?: string;

  // borné : sinon le serveur génère `2 x roundCount` requêtes ORDER BY RANDOM()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_ROUND_COUNT)
  @Max(MAX_ROUND_COUNT)
  roundCount?: number;
}

export class JoinQueueDto {
  @IsEnum(MiniGameType)
  gameType: MiniGameType;

  @IsOptional()
  @ValidateNested()
  @Type(() => JoinQueueParamsDto)
  params?: JoinQueueParamsDto;
}

export class SessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class SubmitGuessDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  // IsNumber rejette NaN et Infinity par défaut
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_GUESS)
  guess: number;

  // accepté pour les clients existants mais ignoré : le temps est mesuré côté
  // serveur, une valeur négative gonflerait le bonus de vitesse
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  timeTaken?: number;
}
