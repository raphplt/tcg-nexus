/**
 * Accès à TCGdex par langue, et règles de filtrage communes aux scripts.
 */
import type { DatasetLocale } from "@repo/pokemon-dataset";
import TCGdex from "@tcgdex/sdk";

const clients = new Map<DatasetLocale, TCGdex>();

/** Une instance de SDK par langue : la langue est figée à l'instanciation. */
export function tcgdexFor(locale: DatasetLocale): TCGdex {
  const existing = clients.get(locale);
  if (existing) return existing;

  const client = new TCGdex(locale);
  clients.set(locale, client);
  return client;
}

/**
 * Interroge TCGdex dans une langue donnée.
 *
 * Les types du SDK sont des classes nominales sans signature d'index : on les
 * réexpose sous la forme souple du dataset, qui conserve la réponse brute.
 */
export async function fetchFrom<T>(
  locale: DatasetLocale,
  endpoint: "series" | "sets" | "cards",
  id?: string,
): Promise<T | null> {
  // `fetch` est surchargé endpoint par endpoint dans le SDK ; on l'appelle via
  // une signature générique pour pouvoir passer l'endpoint en paramètre.
  const call = tcgdexFor(locale).fetch.bind(tcgdexFor(locale)) as (
    ...args: string[]
  ) => Promise<unknown>;

  const result =
    id === undefined ? await call(endpoint) : await call(endpoint, id);
  return (result ?? null) as T | null;
}

/**
 * Pokémon Pocket est un jeu distinct, hors périmètre du catalogue.
 * Ses sets sont reconnaissables au nom, à la série ou à des ids connus.
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
