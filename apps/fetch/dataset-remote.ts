/**
 * Emplacement du dataset publié sur R2, partagé par `data:pull` et `data:push`.
 *
 * Le dataset n'est pas versionné dans git : il est publié une fois sur R2 et
 * récupéré par `npm run data:pull`, sans credentials, depuis n'importe quel
 * poste ou environnement.
 */
import { DATASET_FORMAT_VERSION } from "@repo/pokemon-dataset";

/** Domaine public du bucket, servi par le CDN Cloudflare. */
const DEFAULT_PUBLIC_URL = "https://cdn.tcg-nexus.org";

export const DATASET_PREFIX = `datasets/pokemon/v${DATASET_FORMAT_VERSION}`;

export const MANIFEST_KEY = `${DATASET_PREFIX}/manifest.json`;

/** Clé R2 d'un fichier du dataset, à partir de son chemin relatif à `data/`. */
export function remoteKey(relativePath: string): string {
  return `${DATASET_PREFIX}/${relativePath}`;
}

/**
 * Base publique de lecture. `R2_PUBLIC_URL` permet de pointer un autre bucket
 * (préproduction, fork) ; à défaut on utilise le CDN du projet, ce qui rend
 * `data:pull` utilisable sans aucune configuration.
 */
export function publicBaseUrl(): string {
  return (process.env.R2_PUBLIC_URL || DEFAULT_PUBLIC_URL).replace(/\/+$/, "");
}

export function publicUrl(key: string): string {
  return `${publicBaseUrl()}/${key}`;
}

/**
 * Exécute `task` sur chaque élément avec au plus `concurrency` tâches en vol.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await task(items[index] as T, index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
