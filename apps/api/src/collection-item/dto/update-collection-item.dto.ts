import { PartialType } from '@nestjs/swagger';
import { CreateCollectionItemDto } from './create-collection-item.dto';

export class UpdateCollectionItemDto extends PartialType(CreateCollectionItemDto) {}
