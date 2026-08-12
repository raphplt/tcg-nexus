/**
 * Pulls the dataset published on R2 into `data/`.
 *
 *   npm run data:pull                 # every locale in the manifest
 *   LOCALES=fr npm run data:pull      # a single locale
 *   npm run data:pull -- --force      # ignores local checksums
 *
 * No credentials needed: reads go through the bucket's public domain. The
 * repository already ships the dataset, so this is only useful to refresh a
 * deployed environment without rebuilding its image.
 */
import {
  type DatasetLocale,
  type DatasetManifest,
  isDatasetLocale,
  resolveDataDir,
  sha256File,
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

const DOWNLOAD_CONCURRENCY = 8;

const dataDir = resolveDataDir();
const force = process.argv.includes("--force");

function requestedLocales(manifest: DatasetManifest): DatasetLocale[] {
  const raw = process.env.LOCALES;
  if (!raw) return manifest.locales;

  const requested = raw
    .split(",")
    .map((locale) => locale.trim().toLowerCase())
    .filter(isDatasetLocale);

  const missing = requested.filter(
    (locale) => !manifest.locales.includes(locale),
  );
  if (missing.length > 0) {
    console.warn(
      `Langue(s) absente(s) du dataset publié : ${missing.join(", ")}.`,
    );
  }

  return requested.filter((locale) => manifest.locales.includes(locale));
}

async function fetchManifest(): Promise<DatasetManifest> {
  const url = publicUrl(MANIFEST_KEY);
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `Manifeste introuvable (HTTP ${response.status}) sur ${url}. ` +
        "Le dataset n'a peut-être jamais été publié : lancer `npm run data:push`.",
    );
  }

  return (await response.json()) as DatasetManifest;
}

/** Is the local file already identical to the manifest entry? */
function isUpToDate(absolutePath: string, expectedSha: string): boolean {
  if (force || !fs.existsSync(absolutePath)) return false;
  return sha256File(absolutePath) === expectedSha;
}

async function download(relativePath: string, expectedSha: string) {
  const url = publicUrl(remoteKey(relativePath));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} sur ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const target = path.join(dataDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);

  if (sha256File(target) !== expectedSha) {
    fs.rmSync(target, { force: true });
    throw new Error(
      `Empreinte incorrecte après téléchargement : ${relativePath}`,
    );
  }
}

async function pull() {
  const manifest = await fetchManifest();
  const locales = requestedLocales(manifest);

  if (locales.length === 0) {
    console.log("Aucune langue à récupérer.");
    return;
  }

  const wanted = manifest.files.filter((file) =>
    locales.some((locale) => file.path.startsWith(`${locale}/`)),
  );
  const missing = wanted.filter(
    (file) => !isUpToDate(path.join(dataDir, file.path), file.sha256),
  );

  const totalBytes = missing.reduce((sum, file) => sum + file.bytes, 0);
  console.log(
    `Dataset publié le ${manifest.generatedAt} — langues : ${locales.join(", ")}`,
  );
  for (const locale of locales) {
    const stats = manifest.stats[locale];
    if (stats) {
      console.log(`  ${locale} : ${stats.sets} sets, ${stats.cards} cartes`);
    }
  }

  if (missing.length === 0) {
    console.log("Dataset local déjà à jour.");
    return;
  }

  console.log(
    `${missing.length}/${wanted.length} fichiers à télécharger ` +
      `(${(totalBytes / 1024 / 1024).toFixed(1)} Mo).`,
  );

  let done = 0;
  const failures: string[] = [];

  await mapWithConcurrency(missing, DOWNLOAD_CONCURRENCY, async (file) => {
    try {
      await download(file.path, file.sha256);
    } catch (error) {
      failures.push(`${file.path} : ${(error as Error).message}`);
    }
    done++;
    process.stdout.write(`\r  ${done}/${missing.length}`);
  });
  process.stdout.write("\n");

  if (failures.length > 0) {
    console.error(`${failures.length} fichier(s) en échec :`);
    for (const failure of failures.slice(0, 10)) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }

  // The local manifest is only written once every file is in place: its
  // presence attests to a complete dataset.
  writeManifest(manifest, dataDir);
  console.log(`Dataset récupéré dans ${dataDir}.`);
}

pull().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
