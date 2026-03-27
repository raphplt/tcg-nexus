import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Card } from "./entities/card.entity";
import { PokemonCardDetails } from "./entities/pokemon-card-details.entity";

/**
 * Synchronise les effets parsés depuis card-effects-registry.json vers la base
 * de données (colonne parsedEffects JSONB sur PokemonCardDetails).
 *
 * Workflow :
 *   1. `npm run parse` dans packages/effect-parser → card-effects-registry.json
 *   2. `npm run sync:effects` dans apps/api (ou automatiquement via npm run seed)
 *   3. L'API lit les effets depuis card.pokemonDetails.parsedEffects
 */
@Injectable()
export class CardEffectsSyncService {
  private readonly logger = new Logger(CardEffectsSyncService.name);

  // Taille des batches pour les requêtes IN et les bulk updates
  private readonly LOOKUP_BATCH = 1000;
  private readonly UPDATE_BATCH = 200;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly detailsRepository: Repository<PokemonCardDetails>,
  ) {}

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

    // Garantir que la colonne existe (TypeORM synchronize peut ne pas avoir tourné)
    await this.dataSource.query(
      `ALTER TABLE pokemon_card_details ADD COLUMN IF NOT EXISTS parsed_effects jsonb`,
    );

    // ── 1. Résoudre tcgDexId → card_id par batches (IN, pas OR) ──────────
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

    // Identifier les introuvables
    for (const id of allTcgDexIds) {
      if (!cardIdByTcgDexId.has(id)) notFound.push(id);
    }

    this.logger.log(
      `Resolved ${cardIdByTcgDexId.size} cards (${notFound.length} not in DB)`,
    );

    // ── 2. Bulk UPDATE par batches via raw SQL ────────────────────────────
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

      // Construire: UPDATE pokemon_card_details SET parsed_effects = vals.effects
      //             FROM (VALUES ($1::uuid, $2::jsonb), ...) AS vals(card_id, effects)
      //             WHERE pokemon_card_details.card_id = vals.card_id
      const placeholders = batch
        .map((_, j) => `($${j * 2 + 1}::uuid, $${j * 2 + 2}::jsonb)`)
        .join(", ");

      const params = batch.flatMap((r) => [r.cardId, JSON.stringify(r.effects)]);

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
