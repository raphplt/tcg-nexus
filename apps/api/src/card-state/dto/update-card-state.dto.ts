import { PartialType } from '@nestjs/swagger';
import { CreateCardStateDto } from './create-card-state.dto';

export class UpdateCardStateDto extends PartialType(CreateCardStateDto) {}
