/**
 * Reports which sealed products get no English name, and why.
 * Read it before extending `SEALED_TERMS`: it ranks the missing vocabulary by
 * how many products each entry would unlock.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  composeSealedName,
  loadSealedNameSources,
  type RawSealedProduct,
} from "./sealed-names.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGACY_FILE = path.resolve(__dirname, "../../data/sealed_products.json");

const records = JSON.parse(
  fs.readFileSync(LEGACY_FILE, "utf-8"),
) as RawSealedProduct[];
const sources = loadSealedNameSources();

const byReason = new Map<string, string[]>();
let translated = 0;

for (const record of records) {
  const composed = composeSealedName(record, sources);
  if (composed.en) {
    translated++;
    continue;
  }
  const reason = composed.skipped ?? "unknown";
  byReason.set(reason, [...(byReason.get(reason) ?? []), composed.fr]);
}

console.log(`translated: ${translated}/${records.length}`);
for (const [reason, names] of byReason) {
  console.log(`\n=== ${reason} (${names.length}) ===`);
  console.log(names.slice(0, 60).join("\n"));
}
