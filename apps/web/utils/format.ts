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

export function formatNumber(
  value: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(locale, options);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return value.toLocaleString(locale, {
      style: "currency",
      currency,
      ...options,
    });
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
