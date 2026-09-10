import { type EntityManager, In } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { CardGame } from "../common/enums/cardGame";
import { DeckCardRole } from "../common/enums/deckCardRole";
import { UserRole } from "../common/enums/user";
import { Deck } from "../deck/entities/deck.entity";
import { DeckCard } from "../deck-card/entities/deck-card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { User } from "../user/entities/user.entity";
import {
  COMPETITIVE_DECK_PRESETS,
  type CompetitiveDeckPreset,
  validateCompetitiveDeckPresets,
} from "./competitive-decks";

/** Controls attribution and read-only verification of tournament deck seeds. */
export interface CompetitiveDeckSeedOptions {
  ownerId?: number;
  checkOnly?: boolean;
}

/** Summarizes complete catalog mappings and idempotent deck creation. */
export interface CompetitiveDeckSeedReport {
  ownerId: number;
  decks: number;
  uniqueCards: number;
  created: number;
  existing: number;
  checkOnly: boolean;
}

/**
 * Resolves exact Pokémon prints and atomically inserts complete public tournament decks.
 * Existing decks are preserved. A database lock serializes concurrent seed runs.
 *
 * @param manager - Database manager shared by both source and compiled seed entry points.
 * @param options - Explicit owner or first administrator, plus an optional read-only check.
 * @param deckPresets - Attributed lists; defaults to the ten checked-in Worlds 2025 lists.
 * @throws Error If attribution, ownership, or any catalog mapping is missing.
 */
export async function seedCompetitiveDeckPresets(
  manager: EntityManager,
  options: CompetitiveDeckSeedOptions = {},
  deckPresets: readonly CompetitiveDeckPreset[] = COMPETITIVE_DECK_PRESETS,
): Promise<CompetitiveDeckSeedReport> {
  validateCompetitiveDeckPresets(deckPresets);
  return manager.transaction(async (transaction) => {
    if (options.checkOnly) {
      await transaction.query("SET TRANSACTION READ ONLY");
    } else {
      await transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "tcg-nexus:competitive-deck-seed",
      ]);
    }

    const owner = await transaction.getRepository(User).findOne({
      where:
        options.ownerId === undefined
          ? { role: UserRole.ADMIN }
          : { id: options.ownerId },
      order: { id: "ASC" },
    });
    if (!owner) {
      throw new Error(
        "Competitive decks require an existing administrator or SEED_DECK_OWNER_ID pointing to an existing user.",
      );
    }

    const identifiers = [
      ...new Set(
        deckPresets.flatMap((preset) =>
          preset.cards.map((entry) => entry.tcgDexId),
        ),
      ),
    ];
    const cards = await transaction.getRepository(Card).find({
      where: { game: CardGame.Pokemon, tcgDexId: In(identifiers) },
      select: { id: true, tcgDexId: true },
    });
    const byIdentifier = new Map(cards.map((card) => [card.tcgDexId, card]));
    const missing = deckPresets.flatMap((preset) => {
      const absent = preset.cards.filter(
        (entry) => !byIdentifier.has(entry.tcgDexId),
      );
      return absent.length
        ? [
            `${preset.key}: ${absent.map((entry) => `${entry.tcgDexId} (${entry.name})`).join(", ")}`,
          ]
        : [];
    });
    if (missing.length) {
      throw new Error(
        `Competitive deck catalog mapping failed. Import the complete catalog before retrying. No decks were written.\n${missing.join("\n")}`,
      );
    }

    const deckRepo = transaction.getRepository(Deck);
    const existing = await deckRepo.find({
      where: {
        user: { id: owner.id },
        name: In(deckPresets.map((preset) => preset.name)),
      },
      select: { id: true, name: true },
      loadEagerRelations: false,
    });
    const existingNames = new Set(existing.map((deck) => deck.name));
    const report: CompetitiveDeckSeedReport = {
      ownerId: owner.id,
      decks: deckPresets.length,
      uniqueCards: identifiers.length,
      created: 0,
      existing: existingNames.size,
      checkOnly: options.checkOnly ?? false,
    };
    if (options.checkOnly || existingNames.size === deckPresets.length)
      return report;

    const formatRepo = transaction.getRepository(DeckFormat);
    const format =
      (await formatRepo.findOne({ where: { type: "Standard" } })) ??
      (await formatRepo.save(formatRepo.create({ type: "Standard" })));
    const deckCardRepo = transaction.getRepository(DeckCard);
    for (const preset of deckPresets) {
      if (existingNames.has(preset.name)) continue;
      const deck = await deckRepo.save(
        deckRepo.create({
          name: preset.name,
          user: owner,
          format,
          isPublic: true,
          coverCard: byIdentifier.get(preset.coverTcgDexId),
        }),
      );
      await deckCardRepo.save(
        preset.cards.map((entry) =>
          deckCardRepo.create({
            deck,
            card: byIdentifier.get(entry.tcgDexId),
            qty: entry.qty,
            role: DeckCardRole.main,
          }),
        ),
      );
      report.created++;
    }
    return report;
  });
}
