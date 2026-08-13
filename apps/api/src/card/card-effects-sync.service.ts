import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { DataSource, In, Repository } from "typeorm";
import { Card } from "./entities/card.entity";
import { PokemonCardDetails } from "./entities/pokemon-card-details.entity";

/**
 * Synchronizes parsed card effects from card-effects-registry.json to the database
 * (populating the parsedEffects JSONB column on PokemonCardDetails).
 *
 * Workflow:
 *   1. `npm run parse` in packages/effect-parser -> card-effects-registry.json
 *   2. `npm run sync:effects` in apps/api (or automatically via seed script)
 *   3. API reads effects from card.pokemonDetails.parsedEffects
 */
@Injectable()
export class CardEffectsSyncService {
  private readonly logger = new Logger(CardEffectsSyncService.name);

  // Batch sizes for IN lookup queries and bulk updates
  private readonly LOOKUP_BATCH = 1000;
  private readonly UPDATE_BATCH = 200;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly detailsRepository: Repository<PokemonCardDetails>,
  ) {}

  /**
   * Reads card effects registry and bulk updates PokemonCardDetails entities in the database.
   *
   * @param registryPath Optional custom path to card-effects-registry.json.
   * @returns Summary of sync operation including total, updated count, and unmapped IDs.
   */
  async syncEffectsFromRegistry(registryPath?: string): Promise<{
    total: number;
    updated: number;
    notFound: string[];
  }> {
    const resolvedPath =
      registryPath ??
      join(
        __dirname,
        "../../../../packages/effect-parser/card-effects-registry.json",
      );

    if (!existsSync(resolvedPath)) {
      throw new Error(
        `Registry not found at ${resolvedPath}. Run 'npm run parse' in packages/effect-parser first.`,
      );
    }

    const registry: Record<string, Record<string, unknown>> = JSON.parse(
      readFileSync(resolvedPath, "utf-8"),
    );

    const allTcgDexIds = Object.keys(registry);
    this.logger.log(`Registry loaded: ${allTcgDexIds.length} entries`);

    // Ensure column exists if TypeORM synchronize has not run
    await this.dataSource.query(
      `ALTER TABLE pokemon_card_details ADD COLUMN IF NOT EXISTS parsed_effects jsonb`,
    );

    // ── 1. Resolve tcgDexId -> card_id in batches ──────────────────────────
    const cardIdByTcgDexId = new Map<string, string>();
    const notFound: string[] = [];

    for (let i = 0; i < allTcgDexIds.length; i += this.LOOKUP_BATCH) {
      const chunk = allTcgDexIds.slice(i, i + this.LOOKUP_BATCH);
      const cards = await this.cardRepository.find({
        where: { tcgDexId: In(chunk) },
        select: ["id", "tcgDexId"],
      });
      for (const card of cards) {
        if (card.tcgDexId) cardIdByTcgDexId.set(card.tcgDexId, card.id);
      }
    }

    // Identify unmapped IDs
    for (const id of allTcgDexIds) {
      if (!cardIdByTcgDexId.has(id)) notFound.push(id);
    }

    this.logger.log(
      `Resolved ${cardIdByTcgDexId.size} cards (${notFound.length} not in DB)`,
    );

    // ── 2. Bulk UPDATE in batches using raw SQL ────────────────────────────
    const rows: Array<{ cardId: string; effects: Record<string, unknown> }> =
      [];
    for (const [tcgDexId, effects] of Object.entries(registry)) {
      const cardId = cardIdByTcgDexId.get(tcgDexId);
      if (cardId) rows.push({ cardId, effects });
    }

    let updated = 0;
    const totalBatches = Math.ceil(rows.length / this.UPDATE_BATCH);

    for (let i = 0; i < rows.length; i += this.UPDATE_BATCH) {
      const batch = rows.slice(i, i + this.UPDATE_BATCH);

      // Build: UPDATE pokemon_card_details SET parsed_effects = vals.effects
      //        FROM (VALUES ($1::uuid, $2::jsonb), ...) AS vals(card_id, effects)
      //        WHERE pokemon_card_details.card_id = vals.card_id
      const placeholders = batch
        .map((_, j) => `($${j * 2 + 1}::uuid, $${j * 2 + 2}::jsonb)`)
        .join(", ");

      const params = batch.flatMap((r) => [
        r.cardId,
        JSON.stringify(r.effects),
      ]);

      await this.dataSource.query(
        `UPDATE pokemon_card_details AS pcd
         SET parsed_effects = vals.effects
         FROM (VALUES ${placeholders}) AS vals(card_id, effects)
         WHERE pcd.card_id = vals.card_id`,
        params,
      );

      updated += batch.length;

      const batchNum = Math.floor(i / this.UPDATE_BATCH) + 1;
      this.logger.log(
        `Batch ${batchNum}/${totalBatches} — ${updated}/${rows.length} updated`,
      );
    }

    this.logger.log(
      `Sync complete: ${updated} updated, ${notFound.length} not in DB`,
    );

    return { total: allTcgDexIds.length, updated, notFound };
  }
}
