/**
 * Publishes the local dataset to R2, where `npm run data:pull` picks it up.
 *
 *   npm run data:push                 # every locale present in data/
 *   LOCALES=en npm run data:push      # a single locale
 *   npm run data:push -- --force      # re-uploads everything, no remote diff
 *
 * Maintainer only: requires the R2 credentials. The repository remains the
 * source of truth; this refreshes deployed environments between releases.
 */
import {
  buildManifest,
  DATASET_LOCALES,
  type DatasetLocale,
  type DatasetManifest,
  listSetIds,
  localesFromEnv,
  resolveDataDir,
  writeManifest,
} from "@repo/pokemon-dataset";
import fs from "fs";
import path from "path";
import {
  MANIFEST_KEY,
  mapWithConcurrency,
  publicUrl,
  remoteKey,
} from "./dataset-remote.js";
import { assertR2Config, uploadBufferToR2 } from "./r2.js";

const UPLOAD_CONCURRENCY = 8;
/** The dataset changes on every scraper run: no frozen CDN cache. */
const DATASET_CACHE_CONTROL = "no-cache";

const dataDir = resolveDataDir();
const force = process.argv.includes("--force");

assertR2Config();

function contentTypeOf(relativePath: string): string {
  return relativePath.endsWith(".json")
    ? "application/json; charset=utf-8"
    : "application/octet-stream";
}

/** Requested locales that actually have cards on disk. */
function localesToPublish(): DatasetLocale[] {
  return localesFromEnv().filter((locale) => {
    const hasCards = listSetIds(locale, dataDir).length > 0;
    if (!hasCards) {
      console.warn(
        `Langue ${locale} ignorée : aucune carte dans data/${locale}.`,
      );
    }
    return hasCards;
  });
}

/** Already published manifest, used to upload only the delta. */
async function fetchRemoteManifest(): Promise<DatasetManifest | null> {
  try {
    const response = await fetch(publicUrl(MANIFEST_KEY), {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as DatasetManifest;
  } catch {
    return null;
  }
}

async function push() {
  const locales = localesToPublish();
  if (locales.length === 0) {
    console.error(
      `Aucune langue à publier. Langues supportées : ${DATASET_LOCALES.join(", ")}.`,
    );
    process.exitCode = 1;
    return;
  }

  const manifest = buildManifest(locales, new Date().toISOString(), dataDir);
  const remote = force ? null : await fetchRemoteManifest();
  const remoteShas = new Map(
    (remote?.files ?? []).map((file) => [file.path, file.sha256]),
  );

  const toUpload = manifest.files.filter(
    (file) => remoteShas.get(file.path) !== file.sha256,
  );

  for (const locale of locales) {
    const stats = manifest.stats[locale];
    console.log(`  ${locale} : ${stats?.sets} sets, ${stats?.cards} cartes`);
  }

  if (toUpload.length === 0) {
    console.log("Dataset distant déjà à jour.");
    return;
  }

  const totalBytes = toUpload.reduce((sum, file) => sum + file.bytes, 0);
  console.log(
    `${toUpload.length}/${manifest.files.length} fichiers à envoyer ` +
      `(${(totalBytes / 1024 / 1024).toFixed(1)} Mo).`,
  );

  let done = 0;
  const failures: string[] = [];

  await mapWithConcurrency(toUpload, UPLOAD_CONCURRENCY, async (file) => {
    const body = fs.readFileSync(path.join(dataDir, file.path));
    const url = await uploadBufferToR2(body, remoteKey(file.path), {
      contentType: contentTypeOf(file.path),
      cacheControl: DATASET_CACHE_CONTROL,
    });
    if (!url) failures.push(file.path);

    done++;
    process.stdout.write(`\r  ${done}/${toUpload.length}`);
  });
  process.stdout.write("\n");

  if (failures.length > 0) {
    console.error(
      `${failures.length} fichier(s) en échec — manifeste non publié pour ne ` +
        "pas décrire un dataset incomplet.",
    );
    for (const failure of failures.slice(0, 10)) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }

  // Published last: until the manifest changes, a concurrent `data:pull`
  // keeps seeing the previous, consistent version.
  const published = await uploadBufferToR2(
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    MANIFEST_KEY,
    {
      contentType: "application/json; charset=utf-8",
      cacheControl: DATASET_CACHE_CONTROL,
    },
  );

  if (!published) {
    console.error("Échec de la publication du manifeste.");
    process.exitCode = 1;
    return;
  }

  writeManifest(manifest, dataDir);
  console.log(`Dataset publié : ${published}`);
}

push().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
