import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import {
  TournamentStatus,
  TournamentType,
} from "../entities/tournament.entity";

export enum TournamentSortField {
  START_DATE = "startDate",
  END_DATE = "endDate",
  NAME = "name",
  LOCATION = "location",
  TYPE = "type",
  STATUS = "status",
  CREATED_AT = "createdAt",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

export class TournamentQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  startDateFrom?: string;

  @IsOptional()
  @IsString()
  startDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(TournamentSortField)
  sortBy?: TournamentSortField = TournamentSortField.START_DATE;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
