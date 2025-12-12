import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateCollectionItemDto } from './create-collection-item.dto';
import { UpdateCollectionItemDto } from './update-collection-item.dto';

describe('CollectionItem DTOs', () => {
  it('should instantiate create dto without errors', () => {
    const dto = plainToInstance(CreateCollectionItemDto, {});
    expect(validateSync(dto, { forbidUnknownValues: false })).toHaveLength(0);
  });

  it('should extend create dto in update dto', () => {
    const dto = plainToInstance(UpdateCollectionItemDto, {});
    expect(validateSync(dto, { forbidUnknownValues: false })).toHaveLength(0);
  });
});
