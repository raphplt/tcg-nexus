"use server";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/config";

const MESSAGES_DIR = path.join(process.cwd(), "messages");

export type TranslationEntry = {
  path: string;
  values: Record<SupportedLocale, string>;
};

type JsonTree = Record<string, unknown>;

/**
 * Les Server Actions sont des endpoints publics : le rôle admin est revérifié
 * ici, la protection de la route ne suffit pas.
 */
async function assertAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001";

  const response = await fetch(`${baseUrl}/auth/profile`, {
    method: "POST",
    headers: { Cookie: cookieHeader, "Content-Type": "application/json" },
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

function messagesFile(locale: SupportedLocale): string {
  // le nom de fichier ne vient jamais de l'utilisateur : locale est validée en amont
  return path.join(MESSAGES_DIR, `${locale}.json`);
}

async function readTree(locale: SupportedLocale): Promise<JsonTree> {
  return JSON.parse(await readFile(messagesFile(locale), "utf8"));
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

function setDeep(tree: JsonTree, keyPath: string, value: string): void {
  const parts = keyPath.split(".");
  let node = tree;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== "object") {
      node[part] = {};
    }
    node = node[part] as JsonTree;
  }
  node[parts[parts.length - 1]!] = value;
}

export async function loadTranslations(): Promise<TranslationEntry[]> {
  await assertAdmin();

  const trees = await Promise.all(
    SUPPORTED_LOCALES.map(
      async (locale) => [locale, flatten(await readTree(locale))] as const,
    ),
  );

  const paths = new Set<string>();
  for (const [, flat] of trees) {
    for (const key of flat.keys()) paths.add(key);
  }

  return [...paths].sort().map((keyPath) => ({
    path: keyPath,
    values: Object.fromEntries(
      trees.map(([locale, flat]) => [locale, flat.get(keyPath) ?? ""]),
    ) as Record<SupportedLocale, string>,
  }));
}

export type SystemContentItem = {
  /** préfixe de clé dans le dictionnaire, ex. SystemContent.faq.12 */
  keyPrefix: string;
  category: string;
  fields: Array<{
    name: string;
    source: string;
    translations: Record<SupportedLocale, string>;
  }>;
};

/**
 * Les contenus système (FAQ...) n'ont pas encore de table de traduction côté
 * API : la version française fait référence et les autres langues vivent dans
 * les dictionnaires, sous SystemContent.
 */
export async function loadSystemContent(): Promise<SystemContentItem[]> {
  await assertAdmin();

  const baseUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001";

  const response = await fetch(`${baseUrl}/faq`, { cache: "no-store" });
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

  const trees = await Promise.all(
    SUPPORTED_LOCALES.map(
      async (locale) => [locale, flatten(await readTree(locale))] as const,
    ),
  );

  const translationsFor = (keyPath: string) =>
    Object.fromEntries(
      trees.map(([locale, flat]) => [locale, flat.get(keyPath) ?? ""]),
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
  | { ok: true; saved: number }
  | { ok: false; error: string };

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

  const byLocale = new Map<SupportedLocale, typeof changes>();
  for (const change of changes) {
    if (!SUPPORTED_LOCALES.includes(change.locale as SupportedLocale)) {
      return { ok: false, error: `INVALID_LOCALE:${change.locale}` };
    }
    const locale = change.locale as SupportedLocale;
    byLocale.set(locale, [...(byLocale.get(locale) ?? []), change]);
  }

  try {
    for (const [locale, localeChanges] of byLocale) {
      const tree = await readTree(locale);
      for (const change of localeChanges) {
        setDeep(tree, change.path, change.value);
      }
      await writeFile(
        messagesFile(locale),
        `${JSON.stringify(tree, null, 2)}\n`,
        "utf8",
      );
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "WRITE_FAILED",
    };
  }

  revalidatePath("/admin/translations");
  return { ok: true, saved: changes.length };
}
