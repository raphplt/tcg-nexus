import { PartialType } from '@nestjs/swagger';
import { CreateDeckCardDto } from './create-deck-card.dto';

export class UpdateDeckCardDto extends PartialType(CreateDeckCardDto) {}
