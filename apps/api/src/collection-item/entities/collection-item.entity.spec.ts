import { getMetadataArgsStorage } from 'typeorm';

import { CollectionItem } from './collection-item.entity';
import { Collection } from 'src/collection/entities/collection.entity';
import { Card } from 'src/card/entities/card.entity';
import { CardState } from 'src/card-state/entities/card-state.entity';

describe('CollectionItem entity', () => {
  it('should register relations with defaults', () => {
    expect(new CollectionItem()).toBeInstanceOf(CollectionItem);

    const relations = getMetadataArgsStorage().relations.filter(
      (r) => r.target === CollectionItem
    );

    const collectionRel = relations.find(
      (r) => r.propertyName === 'collection'
    );
    const collectionType =
      typeof collectionRel?.type === 'function'
        ? (collectionRel.type as () => unknown)()
        : collectionRel?.type;
    expect(collectionType).toBe(Collection);
    expect(collectionRel?.options?.onDelete).toBe('CASCADE');

    const cardRel = relations.find((r) => r.propertyName === 'pokemonCard');
    const cardType =
      typeof cardRel?.type === 'function'
        ? (cardRel.type as () => unknown)()
        : cardRel?.type;
    expect(cardType).toBe(Card);
    expect(cardRel?.options?.eager).toBe(true);

    const stateRel = relations.find((r) => r.propertyName === 'cardState');
    const stateType =
      typeof stateRel?.type === 'function'
        ? (stateRel.type as () => unknown)()
        : stateRel?.type;
    expect(stateType).toBe(CardState);
    expect(stateRel?.options?.eager).toBe(true);

    const columns = getMetadataArgsStorage().columns.filter(
      (c) => c.target === CollectionItem
    );
    const quantity = columns.find((c) => c.propertyName === 'quantity');
    expect(quantity?.options?.default).toBe(1);
  });
});
