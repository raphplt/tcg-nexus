import { DataSource, In } from "typeorm";
import { AppDataSource } from "../src/data-source";
import { Card } from "../src/card/entities/card.entity";
import { CardGame } from "../src/common/enums/cardGame";
import { UserRole } from "../src/common/enums/user";
import { Deck } from "../src/deck/entities/deck.entity";
import { DeckCard } from "../src/deck-card/entities/deck-card.entity";
import { seedCompetitiveDeckPresets } from "../src/seed/competitive-deck-seed";
import { COMPETITIVE_DECK_PRESETS } from "../src/seed/competitive-decks";
import { User } from "../src/user/entities/user.entity";

jest.setTimeout(60_000);

describe("Competitive deck seed (isolated PostgreSQL)", () => {
  let db: DataSource;
  let owner: User;
  const ids = [
    ...new Set(
      COMPETITIVE_DECK_PRESETS.flatMap((deck) =>
        deck.cards.map((card) => card.tcgDexId),
      ),
    ),
  ];

  beforeAll(async () => {
    if (
      process.env.NODE_ENV !== "test" ||
      process.env.DATABASE_NAME !== "tcg_nexus_test"
    ) {
      throw new Error(
        "Run this suite with scripts/run-e2e-postgres.sh against its isolated test database.",
      );
    }
    db = new DataSource({
      ...AppDataSource.options,
      synchronize: false,
      migrationsRun: false,
    });
    await db.initialize();
    await db.query("CREATE EXTENSION IF NOT EXISTS vector");
    await db.synchronize();
    owner = await db
      .getRepository(User)
      .save({
        email: "competitive-seed@example.test",
        firstName: "Seed",
        lastName: "Owner",
        role: UserRole.ADMIN,
      });
  });

  beforeEach(async () => {
    await db.getRepository(Deck).delete({ user: { id: owner.id } });
    const cards = await db
      .getRepository(Card)
      .find({ where: { tcgDexId: In(ids) } });
    const existing = new Set(cards.map((card) => card.tcgDexId));
    await db
      .getRepository(Card)
      .save(
        ids
          .filter((id) => !existing.has(id))
          .map((tcgDexId) => ({ tcgDexId, game: CardGame.Pokemon })),
      );
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  it("creates ten public 60-card decks using database UUIDs, exact quantities, and covers", async () => {
    const report = await seedCompetitiveDeckPresets(db.manager);
    expect(report).toMatchObject({
      created: 10,
      existing: 0,
      uniqueCards: 133,
    });
    const decks = await db
      .getRepository(Deck)
      .find({
        where: { user: { id: owner.id } },
        relations: ["cards", "cards.card", "coverCard", "format"],
      });
    expect(decks).toHaveLength(10);
    for (const preset of COMPETITIVE_DECK_PRESETS) {
      const deck = decks.find((item) => item.name === preset.name)!;
      expect(deck.isPublic).toBe(true);
      expect(deck.format.type).toBe("Standard");
      expect(deck.coverCard.tcgDexId).toBe(preset.coverTcgDexId);
      expect(deck.cards?.reduce((total, entry) => total + entry.qty, 0)).toBe(
        60,
      );
      const quantities = Object.fromEntries(
        deck.cards!.map((entry) => {
          expect(entry.card.id).toMatch(/^[0-9a-f-]{36}$/);
          expect(entry.role).toBe("main");
          return [entry.card.tcgDexId, entry.qty];
        }),
      );
      expect(quantities).toEqual(
        Object.fromEntries(
          preset.cards.map((entry) => [entry.tcgDexId, entry.qty]),
        ),
      );
    }
  });

  it("checks catalog mappings without inserting decks", async () => {
    expect(
      await seedCompetitiveDeckPresets(db.manager, { checkOnly: true }),
    ).toMatchObject({
      checkOnly: true,
      created: 0,
      decks: 10,
      uniqueCards: 133,
    });
    expect(await db.getRepository(Deck).count()).toBe(0);
  });

  it("rejects missing prints before writing any decks", async () => {
    await db.getRepository(Card).delete({ tcgDexId: "sv01-086" });
    await expect(seedCompetitiveDeckPresets(db.manager)).rejects.toThrow(
      "sv01-086",
    );
    expect(await db.getRepository(Deck).count()).toBe(0);
    expect(await db.getRepository(DeckCard).count()).toBe(0);
  });

  it("rolls back deck creation when a card insert fails", async () => {
    await db.query(
      'ALTER TABLE deck_card ADD CONSTRAINT "seed_test_quantity" CHECK (qty < 4)',
    );
    try {
      await expect(seedCompetitiveDeckPresets(db.manager)).rejects.toThrow();
      expect(await db.getRepository(Deck).count()).toBe(0);
      expect(await db.getRepository(DeckCard).count()).toBe(0);
    } finally {
      await db.query(
        'ALTER TABLE deck_card DROP CONSTRAINT "seed_test_quantity"',
      );
    }
  });

  it("serializes concurrent runs and preserves existing deck edits", async () => {
    const reports = await Promise.all([
      seedCompetitiveDeckPresets(db.manager),
      seedCompetitiveDeckPresets(db.manager),
    ]);
    expect(
      reports.map((report) => report.created).sort((a, b) => a - b),
    ).toEqual([0, 10]);
    const deck = await db
      .getRepository(Deck)
      .findOneByOrFail({ name: COMPETITIVE_DECK_PRESETS[0].name });
    await db.getRepository(Deck).update(deck.id, { isPublic: false });
    expect(await seedCompetitiveDeckPresets(db.manager)).toMatchObject({
      created: 0,
      existing: 10,
    });
    expect(
      (await db.getRepository(Deck).findOneByOrFail({ id: deck.id })).isPublic,
    ).toBe(false);
    expect(await db.getRepository(Deck).count()).toBe(10);
  });

  it("does not assign decks to an arbitrary account when the selected owner is missing", async () => {
    await expect(
      seedCompetitiveDeckPresets(db.manager, { ownerId: 2147483647 }),
    ).rejects.toThrow("existing user");
    expect(await db.getRepository(Deck).count()).toBe(0);
  });
});
