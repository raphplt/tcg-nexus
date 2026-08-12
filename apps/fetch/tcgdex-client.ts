/**
 * Per-locale TCGdex access, plus the filtering rules shared by the scripts.
 */
import type { DatasetLocale } from "@repo/pokemon-dataset";
import TCGdex from "@tcgdex/sdk";

const clients = new Map<DatasetLocale, TCGdex>();

/** One SDK instance per locale: the language is fixed at construction time. */
export function tcgdexFor(locale: DatasetLocale): TCGdex {
  const existing = clients.get(locale);
  if (existing) return existing;

  const client = new TCGdex(locale);
  clients.set(locale, client);
  return client;
}

/**
 * Queries TCGdex in a given locale.
 *
 * SDK types are nominal classes without an index signature: results are
 * re-exposed under the dataset's looser shape, which keeps the raw response.
 *
 * @param locale Target locale.
 * @param endpoint TCGdex endpoint to query.
 * @param id Optional resource identifier.
 * @returns Parsed response, or null when the resource is missing.
 */
export async function fetchFrom<T>(
  locale: DatasetLocale,
  endpoint: "series" | "sets" | "cards",
  id?: string,
): Promise<T | null> {
  const call = tcgdexFor(locale).fetch.bind(tcgdexFor(locale)) as (
    ...args: string[]
  ) => Promise<unknown>;

  const result =
    id === undefined ? await call(endpoint) : await call(endpoint, id);
  return (result ?? null) as T | null;
}

/**
 * Pokémon Pocket is a separate game, out of scope for this catalog.
 * Its sets are recognizable by name, by series, or by known ids.
 */
export const POCKET_SET_IDS = new Set([
  "A1",
  "A1a",
  "A2",
  "A2a",
  "A2b",
  "A3",
  "A3a",
  "A3b",
  "A4",
  "A4a",
  "B1a",
  "B2",
  "P-A",
]);

export function isPocketName(name?: string): boolean {
  return (name ?? "").toLowerCase().includes("pocket");
}

export function pocketSerieIds(series: { id: string; name: string }[]) {
  return new Set(
    series.filter((serie) => isPocketName(serie.name)).map((serie) => serie.id),
  );
}

export function isPocketSet(
  set: { id: string; name?: string; serie?: unknown },
  pocketSeries: Set<string>,
): boolean {
  const serieId =
    typeof set.serie === "object" && set.serie !== null
      ? (set.serie as { id?: string }).id
      : (set.serie as string | undefined);

  return (
    POCKET_SET_IDS.has(set.id) ||
    isPocketName(set.name) ||
    (serieId !== undefined && pocketSeries.has(serieId))
  );
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
