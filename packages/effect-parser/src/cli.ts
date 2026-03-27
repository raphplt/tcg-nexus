import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { EffectParser } from "./parser.js";
import { processBatch, type ParserLike } from "./batch-processor.js";
import { validateRegistry } from "./validator.js";
import { GeminiProvider } from "./providers/gemini.js";
import { OpenAIProvider } from "./providers/openai.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { RuleBasedParser } from "./rule-based-parser.js";
import type { LLMProvider } from "./providers/base.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CardInput } from "./prompt-builder.js";
import { loadCardsFromCSV, exportCardInputsToJSON } from "./pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI ─────────────────────────────────────────────────────

const USAGE = `
Usage: tsx src/cli.ts <command> [options]

Commands:
  extract                                 Extract parseable cards from CSV → JSON
  parse-file <input.json> [output.json]   Parse cards from JSON file
  parse-csv [output.json]                 Extract from CSV + parse in one step
  parse-card <card.json>                  Parse a single card
  validate <registry.json>                Validate an existing registry

CSV options (for extract / parse-csv):
  --cards <path>      card.csv path (default: ../../doc/card.csv)
  --details <path>    pokemon_card_details.csv path (default: ../../doc/pokemon_card_details.csv)

Options:
  --provider <gemini|openai|anthropic|rule-based>  LLM provider (default: gemini)
                                          "rule-based" = parseur déterministe, sans API
  --model <model>                         Model override
  --batch-size <n>                        Cards per batch (default: 5)
  --delay <ms>                            Delay between batches (default: 1000)
  --limit <n>                             Limit number of cards to parse (for testing)

Environment:
  GEMINI_API_KEY       API key for Gemini
  OPENAI_API_KEY       API key for OpenAI
  ANTHROPIC_API_KEY    API key for Anthropic
`;

function createProvider(
  providerName: string,
  model?: string,
): LLMProvider {
  switch (providerName) {
    case "gemini":
      return new GeminiProvider(undefined, model);
    case "openai":
      return new OpenAIProvider({ model });
    case "anthropic":
      return new AnthropicProvider({ model });
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/** Retourne le parser approprié selon le provider choisi */
function createParser(providerName: string, model?: string): ParserLike {
  if (providerName === "rule-based") {
    console.log("  Utilisation du parseur déterministe (rule-based) — aucune API requise.");
    return new RuleBasedParser();
  }
  const provider = createProvider(providerName, model);
  return new EffectParser({ provider });
}

function getArg(
  args: string[],
  flag: string,
  defaultValue?: string,
): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];
  const providerName = getArg(args, "--provider", "gemini")!;
  const model = getArg(args, "--model");
  const batchSize = Number(getArg(args, "--batch-size", "5"));
  const delay = Number(getArg(args, "--delay", "1000"));
  const limit = getArg(args, "--limit")
    ? Number(getArg(args, "--limit"))
    : undefined;

  const cardsCsv =
    getArg(args, "--cards") ??
    resolve(__dirname, "../../../doc/card.csv");
  const detailsCsv =
    getArg(args, "--details") ??
    resolve(__dirname, "../../../doc/pokemon_card_details.csv");

  switch (command) {
    case "extract": {
      const output =
        args[1] ?? resolve(__dirname, "../cards-to-parse.json");
      exportCardInputsToJSON({
        cardsCsvPath: resolve(cardsCsv),
        detailsCsvPath: resolve(detailsCsv),
        outputPath: resolve(output),
      });
      break;
    }

    case "parse-csv": {
      const output =
        args[1] ??
        resolve(__dirname, "../card-effects-registry.json");
      console.log("Step 1: Extracting cards from CSV...");
      let cards = loadCardsFromCSV({
        cardsCsvPath: resolve(cardsCsv),
        detailsCsvPath: resolve(detailsCsv),
        outputPath: "",
      });
      if (limit) cards = cards.slice(0, limit);
      console.log(`\nStep 2: Parsing ${cards.length} cards with ${providerName}...`);

      const parser = createParser(providerName, model);

      const csvCheckpoint = output + ".checkpoint";
      const report = await processBatch(parser, cards, {
        batchSize,
        delayBetweenBatches: delay,
        checkpointPath: resolve(csvCheckpoint),
        onBatchComplete: (_results, idx, total) => {
          const pct = Math.round(((idx + 1) / total) * 100);
          console.log(
            `  Batch ${idx + 1}/${total} (${pct}%) — ${report.successCount} ok, ${report.failureCount} fail`,
          );
        },
      });

      writeFileSync(
        resolve(output),
        JSON.stringify(report.registry, null, 2),
      );

      console.log(`\nResults:`);
      console.log(`  Success: ${report.successCount}`);
      console.log(`  Failures: ${report.failureCount}`);
      if (report.failures.length > 0) {
        console.log(`\nFailures:`);
        for (const f of report.failures.slice(0, 20)) {
          console.log(`  ${f.cardId}: ${f.error}`);
        }
        if (report.failures.length > 20) {
          console.log(
            `  ... and ${report.failures.length - 20} more`,
          );
        }
      }
      console.log(`\nRegistry written to: ${output}`);
      break;
    }

    case "parse-file": {
      const inputFile = args[1];
      const outputFile =
        args[2] ?? inputFile?.replace(".json", "-effects.json");

      if (!inputFile || !existsSync(inputFile)) {
        console.error(`Input file not found: ${inputFile}`);
        process.exit(1);
      }

      let cards: CardInput[] = JSON.parse(
        readFileSync(resolve(inputFile), "utf-8"),
      );
      if (limit) cards = cards.slice(0, limit);
      console.log(
        `Parsing ${cards.length} cards with ${providerName}...`,
      );

      const parser = createParser(providerName, model);

      const checkpointFile = outputFile + ".checkpoint";
      let runningSuccess = 0;
      let runningFailure = 0;
      const report = await processBatch(parser, cards, {
        batchSize,
        delayBetweenBatches: delay,
        checkpointPath: resolve(checkpointFile!),
        onBatchComplete: (results, idx, total) => {
          for (const r of results) {
            if (r.success) runningSuccess++;
            else runningFailure++;
          }
          const pct = Math.round(((idx + 1) / total) * 100);
          console.log(
            `  Batch ${idx + 1}/${total} (${pct}%) — ${runningSuccess} ok, ${runningFailure} fail`,
          );
        },
      });

      writeFileSync(
        resolve(outputFile!),
        JSON.stringify(report.registry, null, 2),
      );

      // Clean up checkpoint on successful completion
      if (
        existsSync(resolve(checkpointFile!)) &&
        report.failureCount === 0
      ) {
        const { unlinkSync } = await import("node:fs");
        unlinkSync(resolve(checkpointFile!));
      }

      console.log(`\nResults:`);
      console.log(`  Success: ${report.successCount}`);
      console.log(`  Failures: ${report.failureCount}`);
      if (report.failures.length > 0) {
        console.log(`\nFailures:`);
        for (const f of report.failures) {
          console.log(`  ${f.cardId}: ${f.error}`);
        }
      }
      if (report.warnings.length > 0) {
        console.log(`\nWarnings:`);
        for (const w of report.warnings) {
          console.log(`  ${w}`);
        }
      }
      console.log(`\nRegistry written to: ${outputFile}`);
      break;
    }

    case "parse-card": {
      const cardFile = args[1];
      if (!cardFile || !existsSync(cardFile)) {
        console.error(`Card file not found: ${cardFile}`);
        process.exit(1);
      }

      const card: CardInput = JSON.parse(
        readFileSync(resolve(cardFile), "utf-8"),
      );

      const parserForCard = createParser(providerName, model);
      // parseCard peut ne pas exister sur ParserLike (batch only), on vérifie
      const result =
        "parseCard" in parserForCard
          ? await (parserForCard as any).parseCard(card)
          : (await parserForCard.parseBatch([card]))[0]!;

      if (result.success) {
        console.log(JSON.stringify(result.effects, null, 2));
      } else {
        console.error(`Parse failed: ${result.error}`);
        if (result.rawJSON) {
          console.error(`Raw response: ${result.rawJSON}`);
        }
        process.exit(1);
      }
      break;
    }

    case "validate": {
      const registryFile = args[1];
      if (!registryFile || !existsSync(registryFile)) {
        console.error(`Registry file not found: ${registryFile}`);
        process.exit(1);
      }

      const data = JSON.parse(
        readFileSync(resolve(registryFile), "utf-8"),
      );
      const result = validateRegistry(data);

      if (result.success) {
        const count = Object.keys(result.data!).length;
        console.log(`Registry is valid. ${count} cards.`);
      } else {
        console.error(`Validation errors:`);
        for (const err of result.errors ?? []) {
          console.error(`  ${err.cardId}: ${err.error}`);
        }
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
