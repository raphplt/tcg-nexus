import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export enum ImportMode {
  ADD = "add",
  REPLACE = "replace",
  MERGE = "merge",
}

export class BulkMoveDto {
  @ApiProperty({ description: "Array of collection item IDs to move", type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  itemIds: number[];

  @ApiProperty({ description: "Target collection ID" })
  @IsString()
  @IsNotEmpty()
  targetCollectionId: string;
}

export class BulkDeleteDto {
  @ApiProperty({ description: "Array of collection item IDs to delete", type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  itemIds: number[];
}

export class ImportCsvDto {
  @ApiProperty({ description: "Raw CSV text content" })
  @IsString()
  @IsNotEmpty()
  csvContent: string;

  @ApiPropertyOptional({ enum: ImportMode, default: ImportMode.ADD })
  @IsOptional()
  @IsEnum(ImportMode)
  mode?: ImportMode;

  @ApiPropertyOptional({ description: "Client-provided operation ID for idempotency" })
  @IsOptional()
  @IsString()
  operationId?: string;
}

export class UndoOperationDto {
  @ApiProperty({ description: "Operation ID to undo" })
  @IsString()
  @IsNotEmpty()
  operationId: string;
}

export class ImportResultDto {
  operationId: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; reason: string }>;
}
