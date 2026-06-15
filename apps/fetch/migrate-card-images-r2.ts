/**
 * Backfill : migre les images des cartes DÉJÀ présentes en local
 * (`data/<serie>/<set>/<cardId>.json`) depuis TCGdex vers Cloudflare R2, et
 * réécrit le champ `image` de chaque carte vers l'URL CDN.
 *
 * Caractéristiques :
 *  - Idempotent / reprenable : une carte dont `image` pointe déjà sur le CDN
 *    est ignorée. Relançable sans risque après une interruption.
 *  - Concurrence limitée pour ménager TCGdex et R2.
 *  - Filtres pratiques : `--serie=sv`, `--limit=500`, `--dry-run`,
 *    `--quality=high` (par défaut high+low).
 *
 * ⚠️ Volume : ~19 500 cartes × 2 qualités. À lancer plutôt par série, ou de
 * nuit. Voir aussi la migration DB côté API
 * (`npm run migrate:card-images-cdn`) à exécuter APRÈS ce backfill.
 *
 * Usage :
 *   npx tsx migrate-card-images-r2.ts                 # tout, high+low
 *   npx tsx migrate-card-images-r2.ts --serie=sv      # une série
 *   npx tsx migrate-card-images-r2.ts --dry-run       # simulation
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  assertR2Config,
  migrateCardImageToR2,
  cardKeyPrefixFromTcgdex,
  R2_PUBLIC_URL,
} from "./r2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

const SKIP_FILES = new Set([
  "pokemon_series.json",
  "pokemon_sets.json",
  "sealed_products.json",
]);

const CONCURRENCY = 8;

interface Args {
  serie?: string;
  limit?: number;
  dryRun: boolean;
  qualities: Array<"high" | "low">;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (name: string) =>
    args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const quality = get("quality");
  return {
    serie: get("serie"),
    limit: get("limit") ? parseInt(get("limit") as string, 10) : undefined,
    dryRun: args.includes("--dry-run"),
    qualities:
      quality === "high" || quality === "low"
        ? [quality]
        : (["high", "low"] as Array<"high" | "low">),
  };
}

/** Liste récursivement tous les fichiers JSON de cartes sous DATA_DIR. */
function listCardFiles(serieFilter?: string): string[] {
  const out: string[] = [];
  const series = fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => !serieFilter || d.name === serieFilter);

  for (const serie of series) {
    const serieDir = path.join(DATA_DIR, serie.name);
    const sets = fs
      .readdirSync(serieDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    for (const set of sets) {
      const setDir = path.join(serieDir, set.name);
      for (const f of fs.readdirSync(setDir)) {
        if (f.endsWith(".json") && !SKIP_FILES.has(f)) {
          out.push(path.join(setDir, f));
        }
      }
    }
  }
  return out;
}

interface Stats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
}

async function processFile(file: string, args: Args, stats: Stats) {
  let card: any;
  try {
    card = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    stats.failed++;
    return;
  }

  const image: string | undefined = card.image;

  // Déjà migrée (CDN) ou pas d'image exploitable -> on saute.
  if (!image || (R2_PUBLIC_URL && image.startsWith(R2_PUBLIC_URL))) {
    stats.skipped++;
    return;
  }
  if (!cardKeyPrefixFromTcgdex(image)) {
    stats.skipped++;
    return;
  }

  if (args.dryRun) {
    stats.migrated++;
    return;
  }

  const result = await migrateCardImageToR2(image, args.qualities);
  if (!result || !result.uploaded) {
    stats.failed++;
    return;
  }

  // Réécriture du champ image (et du set.logo si présent et TCGdex nu : on le
  // laisse au normaliseur front, donc on ne touche que `image` ici).
  card.image = result.newBase;
  fs.writeFileSync(file, JSON.stringify(card, null, 4));
  stats.migrated++;
}

/** Exécute une file de tâches avec un pool de concurrence fixe. */
async function runPool(
  files: string[],
  worker: (file: string) => Promise<void>,
  onTick: () => void,
) {
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= files.length) return;
    await worker(files[i]);
    onTick();
    return next();
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => next()),
  );
}

async function main() {
  const args = parseArgs();
  if (!args.dryRun) assertR2Config();

  let files = listCardFiles(args.serie);
  if (args.limit) files = files.slice(0, args.limit);

  const stats: Stats = {
    total: files.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(
    `${args.dryRun ? "[DRY-RUN] " : ""}Backfill images cartes -> R2\n` +
      `  fichiers      : ${files.length}` +
      (args.serie ? ` (série ${args.serie})` : "") +
      `\n  qualités      : ${args.qualities.join(", ")}\n`,
  );

  let done = 0;
  const t0 = Date.now();
  await runPool(
    files,
    (f) => processFile(f, args, stats),
    () => {
      done++;
      if (done % 50 === 0 || done === files.length) {
        const pct = Math.round((done / files.length) * 100);
        process.stdout.write(
          `\r  [${pct}%] ${done}/${files.length} ` +
            `(migrées ${stats.migrated}, ignorées ${stats.skipped}, échecs ${stats.failed})`,
        );
      }
    },
  );

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(
    `\n\n✅ Terminé en ${secs}s — migrées ${stats.migrated}, ` +
      `ignorées ${stats.skipped}, échecs ${stats.failed}.`,
  );
  if (stats.failed > 0) {
    console.log(
      "ℹ️  Des échecs subsistent : relance le script, il reprendra là où il s'est arrêté.",
    );
  }
}

main().catch((err) => {
  console.error("❌ Backfill échoué:", err);
  process.exit(1);
});
