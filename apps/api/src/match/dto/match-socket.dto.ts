import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { ActionType } from "../engine/actions/Action";

/** Player action payload accepted over the socket, before slot resolution. */
export class SocketActionDto {
  @IsEnum(ActionType)
  type: ActionType;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/** Prompt answer payload accepted over the socket. */
export class SocketPromptResponseDto {
  @IsString()
  promptId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selections?: string[];

  @IsOptional()
  @IsInt()
  numericChoice?: number;
}

export class JoinMatchSocketDto {
  @IsInt()
  @Min(1)
  matchId: number;
}

export class MatchActionSocketDto {
  @IsInt()
  @Min(1)
  matchId: number;

  @ValidateNested()
  @Type(() => SocketActionDto)
  action: SocketActionDto;
}

export class MatchPromptSocketDto {
  @IsInt()
  @Min(1)
  matchId: number;

  @ValidateNested()
  @Type(() => SocketPromptResponseDto)
  response: SocketPromptResponseDto;
}

export class JoinCasualSocketDto {
  @IsInt()
  @Min(1)
  sessionId: number;
}

export class CasualActionSocketDto {
  @IsInt()
  @Min(1)
  sessionId: number;

  @ValidateNested()
  @Type(() => SocketActionDto)
  action: SocketActionDto;
}

export class CasualPromptSocketDto {
  @IsInt()
  @Min(1)
  sessionId: number;

  @ValidateNested()
  @Type(() => SocketPromptResponseDto)
  response: SocketPromptResponseDto;
}

export class JoinMatchmakingSocketDto {
  @IsInt()
  @Min(1)
  deckId: number;

  @IsOptional()
  @IsBoolean()
  isRanked?: boolean;
}
