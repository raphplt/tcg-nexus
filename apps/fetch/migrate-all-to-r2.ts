import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL, assertR2Config } from "./r2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
const SERIES_FILE = path.join(DATA_DIR, "pokemon_series.json");
const SETS_FILE = path.join(DATA_DIR, "pokemon_sets.json");
const SEALED_FILE = path.join(DATA_DIR, "sealed_products.json");
const PUBLIC_IMAGES_DIR = path.resolve(__dirname, "../web/public/images");

const CONCURRENCY = 10;

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".ico": return "image/x-icon";
    default: return "application/octet-stream";
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Télécharge une URL et l'envoie sur R2.
 */
async function uploadUrlToR2(sourceUrl: string, key: string): Promise<string | null> {
  try {
    let url = sourceUrl;
    // Réécrire l'ancien hôte public dev R2 bloqué (401) vers le CDN public
    if (url.includes("pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev")) {
      url = url.replace("pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev", "cdn.tcg-nexus.org");
    }
    const response = await fetch(url);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} sur ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: response.headers.get("content-type") || getContentType(url),
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error(`\n❌ Échec upload URL ${sourceUrl} -> ${key}:`, (error as Error).message);
    return null;
  }
}

/**
 * Envoie un fichier local sur R2.
 */
async function uploadFileToR2(localPath: string, key: string): Promise<string | null> {
  try {
    const buffer = fs.readFileSync(localPath);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: getContentType(localPath),
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error(`\n❌ Échec upload fichier ${localPath} -> ${key}:`, (error as Error).message);
    return null;
  }
}

/**
 * Pool de tâches asynchrones avec concurrence limitée.
 */
async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
) {
  let activeCount = 0;
  let index = 0;
  let done = 0;
  const total = items.length;

  return new Promise<void>((resolve, reject) => {
    function startNext() {
      if (index >= total) {
        if (activeCount === 0) resolve();
        return;
      }

      const item = items[index];
      const currentIndex = index;
      index++;
      activeCount++;

      worker(item, currentIndex)
        .catch((err) => console.error("Worker error:", err))
        .finally(() => {
          activeCount--;
          done++;
          if (onProgress) onProgress(done, total);
          startNext();
        });
    }

    const startLimit = Math.min(CONCURRENCY, total);
    if (startLimit === 0) {
      resolve();
      return;
    }
    for (let i = 0; i < startLimit; i++) {
      startNext();
    }
  });
}

// ---------------------------------------------------------------------------
// 1. MIGRATION DES SERIES
// ---------------------------------------------------------------------------
async function migrateSeries() {
  console.log("\n--- Migration des Séries (pokemon_series.json) ---");
  if (!fs.existsSync(SERIES_FILE)) {
    console.log("Fichier pokemon_series.json introuvable.");
    return;
  }

  const series = JSON.parse(fs.readFileSync(SERIES_FILE, "utf-8"));
  let count = 0;

  await runPool(
    series,
    async (serie: any) => {
      if (serie.logo && !serie.logo.startsWith(R2_PUBLIC_URL)) {
        // TCGdex fournit les logos sans extension, on tente en .webp
        const sourceUrl = serie.logo.includes(".") ? serie.logo : `${serie.logo}.webp`;
        const key = `series/${serie.id}/logo.webp`;
        let r2Url = await uploadUrlToR2(sourceUrl, key);
        
        // Fallback TCGdex si R2 échoue (ex: 401 ou 404 car le CDN a bougé)
        if (!r2Url) {
          console.log(`\n  [FALLBACK] Tentative récupération TCGdex pour la série ${serie.id}...`);
          const firstSetId = serie.firstSet?.id || `${serie.id}01`;
          const fallbackUrl = `https://assets.tcgdex.net/fr/${serie.id}/${firstSetId}/logo.webp`;
          r2Url = await uploadUrlToR2(fallbackUrl, key);
        }

        if (r2Url) {
          serie.logo = r2Url;
          count++;
        }
      }
    },
    (done, total) => {
      process.stdout.write(`\r  Progression : ${done}/${total} séries traitées`);
    },
  );
  process.stdout.write("\n");

  fs.writeFileSync(SERIES_FILE, JSON.stringify(series, null, 4));
  console.log(`✅ ${count} logo(s) de séries migrés et pokemon_series.json mis à jour.`);
}

// ---------------------------------------------------------------------------
// 2. MIGRATION DES SETS
// ---------------------------------------------------------------------------
async function migrateSets() {
  console.log("\n--- Migration des Sets (pokemon_sets.json) ---");
  if (!fs.existsSync(SETS_FILE)) {
    console.log("Fichier pokemon_sets.json introuvable.");
    return;
  }

  const sets = JSON.parse(fs.readFileSync(SETS_FILE, "utf-8"));
  let logoCount = 0;
  let symbolCount = 0;

  await runPool(
    sets,
    async (set: any) => {
      const slug = slugify(set.name);

      // 1. Logo
      if (set.logo && !set.logo.startsWith(R2_PUBLIC_URL)) {
        const sourceUrl = set.logo.includes(".") ? set.logo : `${set.logo}.webp`;
        const key = `sets/${slug}/logo.webp`;
        let r2Url = await uploadUrlToR2(sourceUrl, key);
        
        // Fallback TCGdex si R2 échoue
        if (!r2Url) {
          console.log(`\n  [FALLBACK] Tentative récupération TCGdex logo pour le set ${set.id}...`);
          const serieId = set.serieId || set.serie?.id || "base";
          const fallbackUrl = `https://assets.tcgdex.net/fr/${serieId}/${set.id}/logo.webp`;
          r2Url = await uploadUrlToR2(fallbackUrl, key);
        }

        if (r2Url) {
          set.logo = r2Url;
          logoCount++;
        }
      }

      // 2. Symbole
      if (set.symbol && !set.symbol.startsWith(R2_PUBLIC_URL)) {
        const sourceUrl = set.symbol.includes(".") ? set.symbol : `${set.symbol}.png`;
        const key = `sets/${slug}/symbol.png`;
        let r2Url = await uploadUrlToR2(sourceUrl, key);
        
        // Fallback TCGdex si R2 échoue
        if (!r2Url) {
          console.log(`\n  [FALLBACK] Tentative récupération TCGdex symbole pour le set ${set.id}...`);
          const serieId = set.serieId || set.serie?.id || "base";
          const fallbackUrl = `https://assets.tcgdex.net/univ/${serieId}/${set.id}/symbol.png`;
          r2Url = await uploadUrlToR2(fallbackUrl, key);
        }

        if (r2Url) {
          set.symbol = r2Url;
          symbolCount++;
        }
      }
    },
    (done, total) => {
      process.stdout.write(`\r  Progression : ${done}/${total} sets traités`);
    },
  );
  process.stdout.write("\n");

  fs.writeFileSync(SETS_FILE, JSON.stringify(sets, null, 4));
  console.log(`✅ ${logoCount} logo(s) et ${symbolCount} symbole(s) de sets migrés. Fichier pokemon_sets.json mis à jour.`);
}

// ---------------------------------------------------------------------------
// 3. MIGRATION DES PRODUITS SCELLÉS
// ---------------------------------------------------------------------------
async function migrateSealed() {
  console.log("\n--- Migration des Produits Scellés (sealed_products.json) ---");
  if (!fs.existsSync(SEALED_FILE)) {
    console.log("Fichier sealed_products.json introuvable.");
    return;
  }

  const products = JSON.parse(fs.readFileSync(SEALED_FILE, "utf-8"));
  let count = 0;

  await runPool(
    products,
    async (product: any) => {
      if (product.image && product.image.startsWith("http")) {
        // Obtenir l'extension du fichier
        let ext = path.extname(new URL(product.image).pathname) || ".png";
        if (ext.includes("?")) ext = ext.split("?")[0];
        
        // Clé relative dans le bucket R2
        const relativePath = `sealed/${product.id}${ext}`;
        
        const r2Url = await uploadUrlToR2(product.image, relativePath);
        if (r2Url) {
          // IMPORTANT : L'entité SealedProduct attend le CHEMIN RELATIF en base de données.
          product.image = relativePath;
          count++;
        }
      }
    },
    (done, total) => {
      process.stdout.write(`\r  Progression : ${done}/${total} produits scellés traités`);
    },
  );
  process.stdout.write("\n");

  fs.writeFileSync(SEALED_FILE, JSON.stringify(products, null, 4));
  console.log(`✅ ${count} image(s) de produits scellés migrées (chemins relatifs mis à jour).`);
}

// ---------------------------------------------------------------------------
// 4. MIGRATION DES ASSETS STATIQUES (Next.js public folder)
// ---------------------------------------------------------------------------
function getFilesRecursively(dir: string, baseDir: string): { localPath: string; key: string }[] {
  const results: { localPath: string; key: string }[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...getFilesRecursively(filePath, baseDir));
    } else {
      if (file !== ".DS_Store") {
        const relativeKey = path.relative(baseDir, filePath).replace(/\\/g, "/");
        results.push({
          localPath: filePath,
          key: `public/images/${relativeKey}`,
        });
      }
    }
  }
  return results;
}

async function migratePublicAssets() {
  console.log("\n--- Migration des assets du dossier public (Next.js) ---");
  if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
    console.log(`Dossier public ${PUBLIC_IMAGES_DIR} introuvable.`);
    return;
  }

  const files = getFilesRecursively(PUBLIC_IMAGES_DIR, PUBLIC_IMAGES_DIR);
  console.log(`Trouvé ${files.length} fichiers à téléverser.`);

  let count = 0;

  await runPool(
    files,
    async (fileObj: any) => {
      const r2Url = await uploadFileToR2(fileObj.localPath, fileObj.key);
      if (r2Url) count++;
    },
    (done, total) => {
      process.stdout.write(`\r  Progression : ${done}/${total} fichiers téléversés`);
    },
  );
  process.stdout.write("\n");

  console.log(`✅ ${count}/${files.length} fichiers du dossier public envoyés sur Cloudflare R2.`);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  try {
    assertR2Config();
    
    await migrateSeries();
    await migrateSets();
    await migrateSealed();
    await migratePublicAssets();
    
    console.log("\n🎉 Migration de tous les assets terminée avec succès !");
  } catch (error) {
    console.error("\n❌ Échec critique de la migration :", (error as Error).message);
    process.exit(1);
  }
}

main();
