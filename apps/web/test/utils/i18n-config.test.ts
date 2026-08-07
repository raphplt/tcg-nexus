import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  getLocaleFromPathname,
  isSupportedLocale,
  stripLocaleFromPathname,
} from "@/i18n/config";

describe("isSupportedLocale", () => {
  it("accepte les locales déclarées", () => {
    expect(isSupportedLocale("fr")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
  });

  it("rejette toute autre valeur", () => {
    expect(isSupportedLocale("de")).toBe(false);
    expect(isSupportedLocale("fr-FR")).toBe(false);
    expect(isSupportedLocale("../../etc/passwd")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });
});

describe("getLocaleFromPathname", () => {
  it("extrait la locale du premier segment", () => {
    expect(getLocaleFromPathname("/fr")).toBe("fr");
    expect(getLocaleFromPathname("/en/marketplace/cards")).toBe("en");
  });

  it("retourne null sans préfixe de locale valide", () => {
    expect(getLocaleFromPathname("/marketplace")).toBeNull();
    expect(getLocaleFromPathname("/de/marketplace")).toBeNull();
    expect(getLocaleFromPathname("/")).toBeNull();
  });

  it("ne confond pas une locale avec un segment qui commence pareil", () => {
    expect(getLocaleFromPathname("/french/cards")).toBeNull();
    expect(getLocaleFromPathname("/energy")).toBeNull();
  });
});

describe("stripLocaleFromPathname", () => {
  it("retire le préfixe de locale", () => {
    expect(stripLocaleFromPathname("/fr/marketplace")).toBe("/marketplace");
    expect(stripLocaleFromPathname("/en/tournaments/create")).toBe(
      "/tournaments/create",
    );
  });

  it("ramène la racine localisée sur /", () => {
    expect(stripLocaleFromPathname("/fr")).toBe("/");
    expect(stripLocaleFromPathname("/en")).toBe("/");
  });

  it("laisse intact un chemin sans locale", () => {
    expect(stripLocaleFromPathname("/marketplace")).toBe("/marketplace");
    expect(stripLocaleFromPathname("/")).toBe("/");
  });
});

describe("locale par défaut", () => {
  it("est le français", () => {
    expect(DEFAULT_LOCALE).toBe("fr");
  });
});
