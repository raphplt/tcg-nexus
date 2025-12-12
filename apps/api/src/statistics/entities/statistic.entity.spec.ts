import { getMetadataArgsStorage } from 'typeorm';

import { Statistics } from './statistic.entity';
import { Player } from 'src/player/entities/player.entity';
import { Match } from 'src/match/entities/match.entity';

describe('Statistics entity', () => {
  it('should register relations and resolve relation types', () => {
    // Import side-effects register decorators into TypeORM metadata storage.
    const storage = getMetadataArgsStorage();
    const relations = storage.relations.filter(
      (r) => r.target === Statistics
    );

    const playerRel = relations.find((r) => r.propertyName === 'player');
    expect(playerRel).toBeDefined();
    const playerRelType = (() => {
      const relType = playerRel?.type;
      if (typeof relType === 'function') {
        const resolved = (relType as () => unknown)();
        return typeof resolved === 'function' ? resolved : relType;
      }
      return relType;
    })();
    expect(playerRelType).toBe(Player);

    const matchRel = relations.find((r) => r.propertyName === 'match');
    expect(matchRel).toBeDefined();
    const matchRelType = (() => {
      const relType = matchRel?.type;
      if (typeof relType === 'function') {
        const resolved = (relType as () => unknown)();
        return typeof resolved === 'function' ? resolved : relType;
      }
      return relType;
    })();
    expect(matchRelType).toBe(Match);
  });
});
