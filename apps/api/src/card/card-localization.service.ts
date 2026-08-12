import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "src/translation/supported-locales";
import { In, Repository } from "typeorm";
import { CardTranslation } from "./entities/card-translation.entity";

/** Objet de réponse ressemblant à une carte : il porte un id et un `tcgDexId`. */
interface CardLike {
  id: string;
  tcgDexId?: string;
  [key: string]: unknown;
}

function isCardLike(value: unknown): value is CardLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CardLike).id === "string" &&
    typeof (value as CardLike).tcgDexId === "string"
  );
}

/** Profondeur maximale de parcours d'un payload, garde-fou contre les cycles. */
const MAX_DEPTH = 8;

/**
 * Applique les traductions du catalogue sur les cartes d'une réponse.
 *
 * Le web n'a pas à connaître l'existence de `card_translation` : il reçoit une
 * carte dont `name`, `image`, `rarity`… sont déjà résolus dans la langue
 * demandée. La résolution suit l'ordre : langue demandée → langue de repli →
 * valeurs portées par `card` (héritage, jamais vide).
 */
@Injectable()
export class CardLocalizationService {
  constructor(
    @InjectRepository(CardTranslation)
    private readonly translationRepository: Repository<CardTranslation>,
  ) {}

  /**
   * Parcourt un payload, y trouve les cartes et les traduit sur place.
   * Une seule requête, quel que soit le nombre de cartes imbriquées.
   */
  async localize<T>(payload: T, locale: SupportedLocale): Promise<T> {
    const cards = this.collectCards(payload);
    if (cards.length === 0) return payload;

    const byCardId = await this.loadTranslations(
      cards.map((card) => card.id),
      locale,
    );

    for (const card of cards) {
      const translation = byCardId.get(card.id);
      if (translation) this.applyTranslation(card, translation);
    }

    return payload;
  }

  /**
   * Traductions à appliquer, une par carte : celle de la langue demandée, ou
   * celle de la langue de repli quand la carte n'existe pas dans cette langue.
   */
  private async loadTranslations(
    cardIds: string[],
    locale: SupportedLocale,
  ): Promise<Map<string, CardTranslation>> {
    const locales =
      locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];

    const rows = await this.translationRepository.find({
      where: { cardId: In(cardIds), locale: In(locales) },
    });

    const byCardId = new Map<string, CardTranslation>();
    for (const row of rows) {
      const current = byCardId.get(row.cardId);
      // La langue demandée l'emporte toujours sur la langue de repli.
      if (!current || row.locale === locale) byCardId.set(row.cardId, row);
    }

    return byCardId;
  }

  /**
   * Écrase les champs linguistiques de la carte. Un champ absent de la
   * traduction est laissé tel quel plutôt que vidé.
   */
  private applyTranslation(card: CardLike, translation: CardTranslation) {
    assign(card, "name", translation.name);
    assign(card, "image", translation.image);
    assign(card, "category", translation.category);
    assign(card, "rarity", translation.rarity);

    const details = card.pokemonDetails as Record<string, unknown> | undefined;
    if (!details) return;

    assign(details, "description", translation.description);
    assign(details, "effect", translation.effect);
    assign(details, "evolveFrom", translation.evolveFrom);
    assign(details, "stage", translation.stage);
    assign(details, "suffix", translation.suffix);
    assign(details, "item", translation.item);
    assign(details, "abilities", translation.abilities);
    assign(details, "attacks", translation.attacks);
  }

  /** Cartes présentes dans le payload, y compris imbriquées et dédoublonnées. */
  private collectCards(payload: unknown): CardLike[] {
    const found = new Map<string, CardLike>();
    const seen = new Set<unknown>();

    const walk = (value: unknown, depth: number) => {
      if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
        return;
      }
      if (seen.has(value)) return;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) walk(item, depth + 1);
        return;
      }

      if (isCardLike(value)) found.set(value.id, value);

      for (const nested of Object.values(value)) walk(nested, depth + 1);
    };

    walk(payload, 0);
    // Les cartes dédoublonnées par id : deux annonces sur la même carte ne
    // provoquent pas deux fois le même travail.
    return [...found.values()];
  }
}

function assign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined && value !== null) target[key] = value;
}
