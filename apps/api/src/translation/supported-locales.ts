// doit rester aligné avec apps/web/i18n/config.ts
export const SUPPORTED_LOCALES = ["fr", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "fr";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.includes(value as SupportedLocale)
  );
}
