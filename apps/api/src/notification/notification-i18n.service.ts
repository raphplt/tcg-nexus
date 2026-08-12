import { Injectable } from "@nestjs/common";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "src/translation/supported-locales";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

type Entry = { title: string; body: string };
type Dictionary = Record<string, Entry>;

const DICTIONARIES: Record<SupportedLocale, Dictionary> = { fr, en };

@Injectable()
export class NotificationI18nService {
  resolveLocale(locale?: string | null): SupportedLocale {
    return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  }

  /** Rend une notification dans la langue du destinataire. */
  render(
    key: string,
    locale?: string | null,
    params: Record<string, unknown> = {},
  ): Entry {
    const entry = DICTIONARIES[this.resolveLocale(locale)][key];
    if (!entry) {
      return { title: key, body: "" };
    }
    return {
      title: this.interpolate(entry.title, params),
      body: this.interpolate(entry.body, params),
    };
  }

  private interpolate(text: string, params: Record<string, unknown>): string {
    return text.replace(/\{(\w+)\}/g, (match, key) =>
      key in params ? String(params[key]) : match,
    );
  }
}
