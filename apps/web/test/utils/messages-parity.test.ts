import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

type Messages = Record<string, unknown>;

function flattenKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenKeys(value as Messages, path)
      : [path];
  });
}

describe("parité des dictionnaires", () => {
  const frKeys = flattenKeys(fr).sort();
  const enKeys = flattenKeys(en).sort();

  it("aucune clé française manquante en anglais", () => {
    expect(frKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
  });

  it("aucune clé anglaise absente du français", () => {
    expect(enKeys.filter((key) => !frKeys.includes(key))).toEqual([]);
  });

  it("aucune valeur vide", () => {
    const empty = [
      ...flattenEntries(fr).map(([k, v]) => [`fr.${k}`, v] as const),
      ...flattenEntries(en).map(([k, v]) => [`en.${k}`, v] as const),
    ].filter(([, value]) => typeof value === "string" && value.trim() === "");

    expect(empty).toEqual([]);
  });
});

function flattenEntries(
  messages: Messages,
  prefix = "",
): Array<readonly [string, unknown]> {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenEntries(value as Messages, path)
      : [[path, value] as const];
  });
}
