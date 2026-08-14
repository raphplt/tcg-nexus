import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

// clés d'une map fermée côté service, jamais interpolées dans le SQL
export enum DeckSortBy {
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  NAME = "name",
  VIEWS = "views",
  FORMAT_TYPE = "format.type",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

export class FindAllDecksQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formatId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: DeckSortBy })
  @IsOptional()
  @IsEnum(DeckSortBy)
  sortBy?: DeckSortBy;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
