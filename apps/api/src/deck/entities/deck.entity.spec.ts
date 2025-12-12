import { getMetadataArgsStorage } from 'typeorm';

import { Deck } from './deck.entity';
import { User } from 'src/user/entities/user.entity';
import { DeckFormat } from 'src/deck-format/entities/deck-format.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';

describe('Deck entity', () => {
  it('should register relations correctly', () => {
    // Trigger decorator registration
    expect(new Deck()).toBeInstanceOf(Deck);

    const relations = getMetadataArgsStorage().relations.filter(
      (r) => r.target === Deck
    );

    const userRel = relations.find((r) => r.propertyName === 'user');
    const userRelType = (() => {
      const relType = userRel?.type;
      if (typeof relType === 'function') {
        const resolved = (relType as () => unknown)();
        return typeof resolved === 'function' ? resolved : relType;
      }
      return relType;
    })();
    expect(userRelType).toBe(User);
    expect(userRel?.options?.onDelete).toBe('CASCADE');

    const formatRel = relations.find((r) => r.propertyName === 'format');
    const formatRelType = (() => {
      const relType = formatRel?.type;
      if (typeof relType === 'function') {
        const resolved = (relType as () => unknown)();
        return typeof resolved === 'function' ? resolved : relType;
      }
      return relType;
    })();
    expect(formatRelType).toBe(DeckFormat);
    expect(formatRel?.options?.eager).toBe(true);

    const coverCardRel = relations.find((r) => r.propertyName === 'coverCard');
    const coverCardRelType = (() => {
      const relType = coverCardRel?.type;
      if (typeof relType === 'function') {
        const resolved = (relType as () => unknown)();
        return typeof resolved === 'function' ? resolved : relType;
      }
      return relType;
    })();
    expect(coverCardRelType).toBe(PokemonCard);
    expect(coverCardRel?.options?.nullable).toBe(true);

    const cardsRel = relations.find((r) => r.propertyName === 'cards');
    const cardsRelType = (() => {
      const relType = cardsRel?.type;
      if (typeof relType === 'function') {
        const resolved = (relType as () => unknown)();
        return typeof resolved === 'function' ? resolved : relType;
      }
      return relType;
    })();
    expect(cardsRelType).toBe(DeckCard);
    expect(cardsRel?.options?.cascade).toBe(true);
  });

  it('should declare default values in column metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (c) => c.target === Deck
    );
    const isPublic = columns.find((c) => c.propertyName === 'isPublic');
    const views = columns.find((c) => c.propertyName === 'views');

    expect(isPublic?.options?.default).toBe(false);
    expect(views?.options?.default).toBe(0);
  });
});
