import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { EffectParser } from "./parser.js";
import { processBatch } from "./batch-processor.js";
import { validateRegistry } from "./validator.js";
import { GeminiProvider } from "./providers/gemini.js";
import { OpenAIProvider } from "./providers/openai.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import type { LLMProvider } from "./providers/base.js";
import type { CardInput } from "./prompt-builder.js";

// ─── CLI ─────────────────────────────────────────────────────

const USAGE = `
Usage: tsx src/cli.ts <command> [options]

Commands:
  parse-file <input.json> [output.json]   Parse cards from JSON file
  parse-card <card.json>                  Parse a single card
  validate <registry.json>                Validate an existing registry

Options:
  --provider <gemini|openai|anthropic>    LLM provider (default: gemini)
  --model <model>                         Model override
  --batch-size <n>                        Cards per batch (default: 5)
  --delay <ms>                            Delay between batches (default: 1000)

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

  switch (command) {
    case "parse-file": {
      const inputFile = args[1];
      const outputFile =
        args[2] ?? inputFile?.replace(".json", "-effects.json");

      if (!inputFile || !existsSync(inputFile)) {
        console.error(`Input file not found: ${inputFile}`);
        process.exit(1);
      }

      const cards: CardInput[] = JSON.parse(
        readFileSync(resolve(inputFile), "utf-8"),
      );
      console.log(
        `Parsing ${cards.length} cards with ${providerName}...`,
      );

      const provider = createProvider(providerName, model);
      const parser = new EffectParser({ provider });

      const report = await processBatch(parser, cards, {
        batchSize,
        delayBetweenBatches: delay,
        onBatchComplete: (_results, idx, total) => {
          console.log(`  Batch ${idx + 1}/${total} complete`);
        },
      });

      writeFileSync(
        resolve(outputFile!),
        JSON.stringify(report.registry, null, 2),
      );

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

      const provider = createProvider(providerName, model);
      const parser = new EffectParser({ provider });
      const result = await parser.parseCard(card);

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
