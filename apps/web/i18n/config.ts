export const SUPPORTED_LOCALES = ["fr", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "fr";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  fr: "Français",
  en: "English",
};

export const LOCALE_TAGS: Record<SupportedLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.includes(value as SupportedLocale)
  );
}

// Récupérer la langue depuis le pathname
export function getLocaleFromPathname(
  pathname: string,
): SupportedLocale | null {
  const segment = pathname.split("/")[1];
  return isSupportedLocale(segment) ? segment : null;
}

// Retirer le préfixe de locale d'un pathname
export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) {
    return pathname;
  }
  const stripped = pathname.slice(locale.length + 1);
  return stripped.length > 0 ? stripped : "/";
}
