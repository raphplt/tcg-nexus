import { resolveRequestLocale } from "./request-locale";

describe("resolveRequestLocale", () => {
  it("retient la première langue supportée de l'en-tête", () => {
    expect(resolveRequestLocale("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(resolveRequestLocale("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("ignore la variante régionale", () => {
    expect(resolveRequestLocale("en-GB")).toBe("en");
  });

  it("retombe sur la langue par défaut", () => {
    expect(resolveRequestLocale(undefined)).toBe("fr");
    expect(resolveRequestLocale("")).toBe("fr");
    // Langue non activée : on ne sert pas de l'allemand qu'on n'a pas.
    expect(resolveRequestLocale("de-DE,de;q=0.9")).toBe("fr");
  });

  it("saute les langues non supportées pour trouver une langue connue", () => {
    expect(resolveRequestLocale("de-DE,de;q=0.9,en;q=0.5")).toBe("en");
  });
});
