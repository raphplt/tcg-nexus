import { EffectParser, type ParseResult } from "./parser.js";
import type { CardInput } from "./prompt-builder.js";
import { checkCoherence } from "./validator.js";
import type { CardEffectsRegistry } from "./schema.js";

export interface BatchOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  onBatchComplete?: (
    results: ParseResult[],
    batchIndex: number,
    total: number,
  ) => void;
}

export interface BatchReport {
  registry: CardEffectsRegistry;
  successCount: number;
  failureCount: number;
  failures: { cardId: string; error: string }[];
  warnings: string[];
}

/**
 * Process a large set of cards in batches, with rate limiting.
 */
export async function processBatch(
  parser: EffectParser,
  cards: CardInput[],
  opts?: BatchOptions,
): Promise<BatchReport> {
  const batchSize = opts?.batchSize ?? 5;
  const delay = opts?.delayBetweenBatches ?? 1000;

  const registry: CardEffectsRegistry = {};
  const failures: { cardId: string; error: string }[] = [];
  const warnings: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Filter out energy cards (no effects to parse)
  const parseable = cards.filter(
    (c) => c.category !== "Énergie",
  );

  const totalBatches = Math.ceil(parseable.length / batchSize);

  for (let i = 0; i < parseable.length; i += batchSize) {
    const batch = parseable.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    const results = await parser.parseBatch(batch);

    for (const result of results) {
      if (result.success && result.effects) {
        registry[result.cardId] = result.effects;
        successCount++;

        // Run coherence checks
        const cardWarnings = checkCoherence(
          result.cardId,
          result.effects,
        );
        warnings.push(...cardWarnings);
      } else {
        failureCount++;
        failures.push({
          cardId: result.cardId,
          error: result.error ?? "Unknown error",
        });
      }
    }

    opts?.onBatchComplete?.(results, batchIndex, totalBatches);

    // Rate limit between batches
    if (i + batchSize < parseable.length && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    registry,
    successCount,
    failureCount,
    failures,
    warnings,
  };
}
