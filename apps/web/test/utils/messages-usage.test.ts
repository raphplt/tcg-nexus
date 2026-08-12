import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fr from "@/messages/fr.json";

const ROOTS = ["app", "components", "hooks", "contexts"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" ? [] : walk(full);
    }
    return full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });
}

function resolve(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      fr,
    );
}

/**
 * Associates each `useTranslations("Namespace")` call with literal `t("key")`
 * usages in the same file. Dynamically constructed keys cannot be verified and
 * are ignored.
 */
function collectUsages(source: string): string[] {
  const namespaces = [...source.matchAll(/useTranslations\("([^"]+)"\)/g)].map(
    (m) => m[1],
  );
  if (namespaces.length === 0) return [];

  const keys = [...source.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
  if (namespaces.length === 1) {
    return keys.map((key) => `${namespaces[0]}.${key}`);
  }

  return keys.map((key) => {
    const hit = namespaces.find((ns) => resolve(`${ns}.${key}`) !== undefined);
    return `${hit ?? namespaces[0]}.${key}`;
  });
}

describe("clés de traduction utilisées", () => {
  const files = ROOTS.flatMap(walk);

  it("toutes les clés littérales existent dans fr.json", () => {
    const missing: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const path of collectUsages(source)) {
        if (typeof resolve(path) !== "string") {
          missing.push(`${file} -> ${path}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
