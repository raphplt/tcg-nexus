import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { DeckCardRole } from "../../common/enums/deckCardRole";

class ImportDeckCardDto {
  @ApiProperty({ example: "swsh4-185" })
  @IsString()
  @IsNotEmpty()
  tcgDexId: string;

  @ApiProperty({ example: "Dame du Centre Pokémon", required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ enum: DeckCardRole, example: DeckCardRole.main })
  @IsEnum(DeckCardRole)
  role: DeckCardRole;
}

export class ImportDeckJsonDto {
  @ApiProperty({ example: "Mon deck compétitif" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Standard" })
  @IsString()
  @IsNotEmpty()
  format: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ type: [ImportDeckCardDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportDeckCardDto)
  cards: ImportDeckCardDto[];
}
