import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TranslationEntryDto } from "./dto/upsert-translations.dto";
import { Translation } from "./entities/translation.entity";
import { isSupportedLocale, SUPPORTED_LOCALES } from "./supported-locales";

export type TranslationOverrides = Record<string, Record<string, string>>;

@Injectable()
export class TranslationService {
  constructor(
    @InjectRepository(Translation)
    private readonly repository: Repository<Translation>,
  ) {}

  /** Overrides groupés par locale, prêts à être fusionnés avec les dictionnaires. */
  async findAllGrouped(locale?: string): Promise<TranslationOverrides> {
    const where = isSupportedLocale(locale) ? { locale } : {};
    const rows = await this.repository.find({ where });

    const grouped: TranslationOverrides = Object.fromEntries(
      SUPPORTED_LOCALES.map((supported) => [supported, {}]),
    );

    for (const row of rows) {
      if (!grouped[row.locale]) {
        grouped[row.locale] = {};
      }
      grouped[row.locale][row.key] = row.value;
    }

    return grouped;
  }

  /**
   * Une valeur vide supprime l'override : la clé retombe sur le dictionnaire
   * du dépôt plutôt que d'afficher du vide.
   */
  async upsertMany(entries: TranslationEntryDto[]): Promise<number> {
    const toRemove = entries.filter((entry) => entry.value.trim() === "");
    const toUpsert = entries.filter((entry) => entry.value.trim() !== "");

    for (const entry of toRemove) {
      await this.repository.delete({ locale: entry.locale, key: entry.key });
    }

    if (toUpsert.length > 0) {
      await this.repository.upsert(toUpsert, ["locale", "key"]);
    }

    return entries.length;
  }
}
