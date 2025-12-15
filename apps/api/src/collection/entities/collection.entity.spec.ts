import { getMetadataArgsStorage } from 'typeorm';

import { Collection } from './collection.entity';
import { User } from 'src/user/entities/user.entity';
import { CollectionItem } from 'src/collection-item/entities/collection-item.entity';

describe('Collection entity', () => {
  it('should register relations and defaults', () => {
    expect(new Collection()).toBeInstanceOf(Collection);

    const relations = getMetadataArgsStorage().relations.filter(
      (r) => r.target === Collection
    );

    const userRel = relations.find((r) => r.propertyName === 'user');
    const userType =
      typeof userRel?.type === 'function'
        ? (userRel.type as () => unknown)()
        : userRel?.type;
    expect(userType).toBe(User);
    expect(userRel?.options?.onDelete).toBe('CASCADE');

    const itemsRel = relations.find((r) => r.propertyName === 'items');
    const itemsType =
      typeof itemsRel?.type === 'function'
        ? (itemsRel.type as () => unknown)()
        : itemsRel?.type;
    expect(itemsType).toBe(CollectionItem);
    expect(itemsRel?.options?.cascade).toBe(true);

    const columns = getMetadataArgsStorage().columns.filter(
      (c) => c.target === Collection
    );
    const isPublic = columns.find((c) => c.propertyName === 'isPublic');
    expect(isPublic?.options?.default).toBe(false);
  });
});
