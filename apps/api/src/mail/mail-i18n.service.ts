import { Injectable } from "@nestjs/common";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "src/translation/supported-locales";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

type Dictionary = Record<string, Record<string, string>>;

const DICTIONARIES: Record<SupportedLocale, Dictionary> = { fr, en };

export type MailTexts = Record<string, string>;

@Injectable()
export class MailI18nService {
  resolveLocale(locale?: string | null): SupportedLocale {
    return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  }

  /** Textes d'un template, fusionnés avec les libellés communs. */
  texts(template: string, locale?: string | null): MailTexts {
    const dictionary = DICTIONARIES[this.resolveLocale(locale)];
    return { ...dictionary.common, ...(dictionary[template] ?? {}) };
  }

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
