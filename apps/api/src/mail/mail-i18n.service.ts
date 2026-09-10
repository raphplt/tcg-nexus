import { Injectable } from "@nestjs/common";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "../translation/supported-locales";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

type Dictionary = Record<string, Record<string, string>>;

const DICTIONARIES: Record<SupportedLocale, Dictionary> = { fr, en };

export type MailTexts = Record<string, string>;

/**
 * Service managing email template internationalization and subject interpolation.
 */
@Injectable()
export class MailI18nService {
  /**
   * Resolves a validated locale fallback.
   *
   * @param locale - Optional locale string.
   * @returns Supported locale code.
   */
  resolveLocale(locale?: string | null): SupportedLocale {
    return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  }

  /**
   * Retrieves localized template strings merged with common dictionary labels.
   *
   * @param template - Template identifier.
   * @param locale - Optional target locale.
   * @returns Dictionary of template texts.
   */
  texts(template: string, locale?: string | null): MailTexts {
    const dictionary = DICTIONARIES[this.resolveLocale(locale)];
    return { ...dictionary.common, ...(dictionary[template] ?? {}) };
  }

  /**
   * Formats an email subject line with variable parameter interpolation.
   *
   * @param template - Template identifier.
   * @param locale - Optional target locale.
   * @param params - Interpolation parameters.
   * @returns Interpolated subject line.
   */
  subject(
    template: string,
    locale?: string | null,
    params: Record<string, unknown> = {},
  ): string {
    const raw = this.texts(template, locale).subject ?? template;
    return raw.replace(/\{(\w+)\}/g, (match, key) =>
      key in params ? String(params[key]) : match,
    );
  }
}
