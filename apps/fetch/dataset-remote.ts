/**
 * Location of the dataset published on R2, shared by `data:pull` and `data:push`.
 *
 * The repository is the source of truth for the dataset; R2 only exists to
 * refresh an already deployed environment without rebuilding its image.
 */
import { DATASET_FORMAT_VERSION } from "@repo/pokemon-dataset";

/** Public bucket domain, served by the Cloudflare CDN. */
const DEFAULT_PUBLIC_URL = "https://cdn.tcg-nexus.org";

export const DATASET_PREFIX = `datasets/pokemon/v${DATASET_FORMAT_VERSION}`;

export const MANIFEST_KEY = `${DATASET_PREFIX}/manifest.json`;

/** R2 key of a dataset file, from its path relative to `data/`. */
export function remoteKey(relativePath: string): string {
  return `${DATASET_PREFIX}/${relativePath}`;
}

/**
 * Public read base. `R2_PUBLIC_URL` can point at another bucket (staging,
 * fork); otherwise the project CDN is used, which makes `data:pull` usable
 * without any configuration.
 */
export function publicBaseUrl(): string {
  return (process.env.R2_PUBLIC_URL || DEFAULT_PUBLIC_URL).replace(/\/+$/, "");
}

export function publicUrl(key: string): string {
  return `${publicBaseUrl()}/${key}`;
}

/**
 * Runs `task` over every item with at most `concurrency` tasks in flight.
 *
 * @param items Items to process.
 * @param concurrency Maximum number of concurrent tasks.
 * @param task Callback invoked per item.
 * @returns Results in the same order as `items`.
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
