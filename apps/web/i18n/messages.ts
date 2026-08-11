import type { SupportedLocale } from "./config";

type Messages = Record<string, unknown>;

type Overrides = Record<string, Record<string, string>>;

const CACHE_TTL_MS = 60_000;

let cache: { overrides: Overrides; expiresAt: number } | null = null;

function apiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001"
  );
}

/**
 * Les overrides sont éditables depuis l'administration : on les relit
 * périodiquement plutôt qu'à chaque rendu.
 */
async function fetchOverrides(): Promise<Overrides> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.overrides;
  }

  try {
    const response = await fetch(`${apiBaseUrl()}/translations`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const overrides = (await response.json()) as Overrides;
    cache = { overrides, expiresAt: Date.now() + CACHE_TTL_MS };
    return overrides;
  } catch {
    // l'API indisponible ne doit pas casser le rendu : on garde les
    // dictionnaires du dépôt, quitte à servir des traductions un peu datées
    return cache?.overrides ?? {};
  }
}

export function invalidateMessagesCache(): void {
  cache = null;
}

function applyOverride(tree: Messages, keyPath: string, value: string): void {
  const parts = keyPath.split(".");
  let node = tree;
  for (const part of parts.slice(0, -1)) {
    const next = node[part];
    if (!next || typeof next !== "object") {
      node[part] = {};
    }
    node = node[part] as Messages;
  }
  node[parts[parts.length - 1]!] = value;
}

/** Dictionnaire du dépôt, surchargé par les traductions éditées en base. */
export async function loadMessages(locale: SupportedLocale): Promise<Messages> {
  const base = (await import(`../messages/${locale}.json`)).default as Messages;
  const overrides = (await fetchOverrides())[locale];

  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  const merged = structuredClone(base);
  for (const [keyPath, value] of Object.entries(overrides)) {
    applyOverride(merged, keyPath, value);
  }
  return merged;
}
