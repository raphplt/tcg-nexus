"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/config";
import { invalidateMessagesCache } from "@/i18n/messages";

export type TranslationEntry = {
  path: string;
  values: Record<SupportedLocale, string>;
  /** Whether the value comes from the database rather than the repository dictionary. */
  overridden: Partial<Record<SupportedLocale, boolean>>;
};

type JsonTree = Record<string, unknown>;
type Overrides = Record<string, Record<string, string>>;

function apiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001"
  );
}

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/**
 * Server Actions are public endpoints, so administrator access is rechecked
 * here instead of relying solely on route protection.
 */
async function assertAdmin(): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/auth/profile`, {
    method: "POST",
    headers: {
      Cookie: await cookieHeader(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("UNAUTHORIZED");
  }

  const profile = await response.json();
  const role = profile?.role ?? profile?.user?.role;
  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

function flatten(tree: JsonTree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      for (const [k, v] of flatten(value as JsonTree, full)) {
        out.set(k, v);
      }
    } else if (typeof value === "string") {
      out.set(full, value);
    }
  }
  return out;
}

async function readBaseDictionary(
  locale: SupportedLocale,
): Promise<Map<string, string>> {
  const tree = (await import(`@/messages/${locale}.json`)).default as JsonTree;
  return flatten(tree);
}

async function fetchOverrides(): Promise<Overrides> {
  const response = await fetch(`${apiBaseUrl()}/translations`, {
    cache: "no-store",
  });
  return response.ok ? await response.json() : {};
}

export async function loadTranslations(): Promise<TranslationEntry[]> {
  await assertAdmin();

  const overrides = await fetchOverrides();
  const dictionaries = await Promise.all(
    SUPPORTED_LOCALES.map(
      async (locale) => [locale, await readBaseDictionary(locale)] as const,
    ),
  );

  const paths = new Set<string>();
  for (const [, flat] of dictionaries) {
    for (const key of flat.keys()) paths.add(key);
  }
  for (const localeOverrides of Object.values(overrides)) {
    for (const key of Object.keys(localeOverrides)) paths.add(key);
  }

  return [...paths].sort().map((keyPath) => {
    const values = {} as Record<SupportedLocale, string>;
    const overridden: Partial<Record<SupportedLocale, boolean>> = {};

    for (const [locale, flat] of dictionaries) {
      const override = overrides[locale]?.[keyPath];
      values[locale] = override ?? flat.get(keyPath) ?? "";
      overridden[locale] = override !== undefined;
    }

    return { path: keyPath, values, overridden };
  });
}

export type SystemContentItem = {
  /** Dictionary key prefix, for example `SystemContent.faq.12`. */
  keyPrefix: string;
  category: string;
  fields: Array<{
    name: string;
    source: string;
    translations: Record<SupportedLocale, string>;
  }>;
};

/**
 * System content such as FAQs has no API translation table yet. French is the reference version, and other languages are stored as ordinary `SystemContent` keys.
 */
export async function loadSystemContent(): Promise<SystemContentItem[]> {
  await assertAdmin();

  const response = await fetch(`${apiBaseUrl()}/faq`, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const items: Array<{
    id: number;
    question: string;
    answer: string;
    category: string;
  }> = Array.isArray(payload) ? payload : (payload?.data ?? []);

  const overrides = await fetchOverrides();

  const translationsFor = (keyPath: string) =>
    Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [
        locale,
        overrides[locale]?.[keyPath] ?? "",
      ]),
    ) as Record<SupportedLocale, string>;

  return items.map((item) => {
    const keyPrefix = `SystemContent.faq.${item.id}`;
    return {
      keyPrefix,
      category: item.category,
      fields: [
        {
          name: "question",
          source: item.question,
          translations: translationsFor(`${keyPrefix}.question`),
        },
        {
          name: "answer",
          source: item.answer,
          translations: translationsFor(`${keyPrefix}.answer`),
        },
      ],
    };
  });
}

export type SaveResult =
  { ok: true; saved: number } | { ok: false; error: string };

export async function saveTranslations(
  changes: Array<{ path: string; locale: string; value: string }>,
): Promise<SaveResult> {
  try {
    await assertAdmin();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "UNAUTHORIZED",
    };
  }

  for (const change of changes) {
    if (!SUPPORTED_LOCALES.includes(change.locale as SupportedLocale)) {
      return { ok: false, error: `INVALID_LOCALE:${change.locale}` };
    }
  }

  const response = await fetch(`${apiBaseUrl()}/translations`, {
    method: "PUT",
    headers: {
      Cookie: await cookieHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entries: changes.map(({ path, locale, value }) => ({
        locale,
        key: path,
        value,
      })),
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `API_${response.status}` };
  }

  invalidateMessagesCache();
  revalidatePath("/", "layout");
  return { ok: true, saved: changes.length };
}
