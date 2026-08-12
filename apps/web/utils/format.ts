import { DEFAULT_LOCALE, type SupportedLocale } from "@/i18n/config";

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, options);
}

export function formatDateTime(
  value: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, options);
}

/** Convertit une valeur potentiellement absente ou textuelle en nombre exploitable. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumber(
  value: number | string | null | undefined,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return parsed.toLocaleString(locale, options);
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  try {
    return parsed.toLocaleString(locale, {
      style: "currency",
      currency,
      ...options,
    });
  } catch {
    return `${parsed.toFixed(2)} ${currency}`;
  }
}
