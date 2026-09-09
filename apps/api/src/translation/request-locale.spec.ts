import { resolveRequestLocale } from "./request-locale";

describe("resolveRequestLocale", () => {
  it("retient la première langue supportée de l'en-tête", () => {
    expect(resolveRequestLocale("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(resolveRequestLocale("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("ignore la variante régionale", () => {
    expect(resolveRequestLocale("en-GB")).toBe("en");
  });

  it("falls back to default locale", () => {
    expect(resolveRequestLocale(undefined)).toBe("fr");
    expect(resolveRequestLocale("")).toBe("fr");
    // Inactive locale: fall back to default when German is unsupported
    expect(resolveRequestLocale("de-DE,de;q=0.9")).toBe("fr");
  });

  it("skips unsupported languages to find a supported locale", () => {
    expect(resolveRequestLocale("de-DE,de;q=0.9,en;q=0.5")).toBe("en");
  });
});
