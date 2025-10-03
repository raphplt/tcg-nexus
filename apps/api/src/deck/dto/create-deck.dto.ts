import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class DeckCardInputDto {
    @IsUUID()
    cardId: string;

    @IsInt()
    qty: number;

    @IsString()
    role: string;
}

export class CreateDeckDto {
    @IsString()
    @IsNotEmpty()
    deckName: string;

    @IsBoolean()
    isPublic: boolean;

    @IsInt()
    formatId: number;

    @ValidateNested({ each: true })
    @Type(() => DeckCardInputDto)
    cards: DeckCardInputDto[];
}