import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { EffectParser, type ParseResult } from "./parser.js";
import type { CardInput } from "./prompt-builder.js";
import { checkCoherence } from "./validator.js";
import type { CardEffectsRegistry } from "./schema.js";

export interface BatchOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  /** Save progress to this file after each batch (enables resume) */
  checkpointPath?: string;
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

interface Checkpoint {
  registry: CardEffectsRegistry;
  processedCardIds: string[];
  failures: { cardId: string; error: string }[];
  warnings: string[];
}

function loadCheckpoint(path: string): Checkpoint | null {
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    if (data.registry && data.processedCardIds) {
      return data as Checkpoint;
    }
  } catch {}
  return null;
}

function saveCheckpoint(path: string, checkpoint: Checkpoint) {
  writeFileSync(path, JSON.stringify(checkpoint));
}

/**
 * Process a large set of cards in batches, with rate limiting
 * and checkpoint/resume support.
 */
export async function processBatch(
  parser: EffectParser,
  cards: CardInput[],
  opts?: BatchOptions,
): Promise<BatchReport> {
  const batchSize = opts?.batchSize ?? 5;
  const delay = opts?.delayBetweenBatches ?? 1000;
  const checkpointPath = opts?.checkpointPath;

  // Load checkpoint if available
  let checkpoint: Checkpoint | null = null;
  if (checkpointPath) {
    checkpoint = loadCheckpoint(checkpointPath);
    if (checkpoint) {
      const n = checkpoint.processedCardIds.length;
      console.log(`  Resuming from checkpoint: ${n} cards already processed`);
    }
  }

  const registry: CardEffectsRegistry = checkpoint?.registry ?? {};
  const processedIds = new Set(checkpoint?.processedCardIds ?? []);
  const failures: { cardId: string; error: string }[] =
    checkpoint?.failures ?? [];
  const warnings: string[] = checkpoint?.warnings ?? [];
  let successCount = Object.keys(registry).length;
  let failureCount = failures.length;

  // Filter out energy cards and already-processed cards
  const parseable = cards.filter(
    (c) => c.category !== "Énergie" && !processedIds.has(c.id),
  );

  if (parseable.length === 0) {
    console.log("  All cards already processed!");
    return { registry, successCount, failureCount, failures, warnings };
  }

  const totalBatches = Math.ceil(parseable.length / batchSize);

  // Graceful shutdown on Ctrl+C
  let interrupted = false;
  const onInterrupt = () => {
    if (interrupted) {
      console.log("\nForce quit.");
      process.exit(1);
    }
    interrupted = true;
    console.log(
      "\n\nInterrupted! Saving checkpoint... (press Ctrl+C again to force quit)",
    );
  };
  process.on("SIGINT", onInterrupt);

  try {
    for (let i = 0; i < parseable.length; i += batchSize) {
      if (interrupted) break;

      const batch = parseable.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);

      const results = await parser.parseBatch(batch);

      for (const result of results) {
        processedIds.add(result.cardId);

        if (result.success && result.effects) {
          registry[result.cardId] = result.effects;
          successCount++;

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

      // Save checkpoint after each batch
      if (checkpointPath) {
        saveCheckpoint(checkpointPath, {
          registry,
          processedCardIds: [...processedIds],
          failures,
          warnings,
        });
      }

      // Rate limit between batches
      if (
        !interrupted &&
        i + batchSize < parseable.length &&
        delay > 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } finally {
    process.removeListener("SIGINT", onInterrupt);

    // Final checkpoint save
    if (checkpointPath) {
      saveCheckpoint(checkpointPath, {
        registry,
        processedCardIds: [...processedIds],
        failures,
        warnings,
      });
      if (interrupted) {
        console.log(
          `Checkpoint saved. Run the same command to resume (${processedIds.size} cards processed so far).`,
        );
      }
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
