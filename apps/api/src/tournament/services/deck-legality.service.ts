import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isUUID } from "class-validator";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { DeckFormat } from "src/deck-format/entities/deck-format.entity";
import { In, Repository } from "typeorm";
import {
  DeckLegalityStatus,
  SnapshotCardItem,
} from "../entities/tournament-deck-snapshot.entity";

/** Rule sets this service knows how to check. */
const KNOWN_RULE_VERSIONS: Record<
  string,
  { legality: "standard" | "expanded" }
> = {
  POKEMON_STANDARD_2026: { legality: "standard" },
  POKEMON_STANDARD_2025: { legality: "standard" },
  POKEMON_EXPANDED_2026: { legality: "expanded" },
};

/** Copies of one card a list may contain outside basic energy. */
const MAX_COPIES_PER_CARD = 4;

/** Cards a legal Pokémon list must contain. */
const REQUIRED_DECK_SIZE = 60;

/**
 * Outcome of checking a submitted list against the rules that could be read.
 *
 * `unknowns` records what could not be checked, so a list is never reported
 * valid on the strength of missing data.
 */
export interface DeckLegalityResult {
  status: DeckLegalityStatus;
  errors: string[];
  unknowns: string[];
  totalCards: number;
}

/**
 * Decides the legality of a tournament deck list from catalog and rule data (TRN-02).
 *
 * Every check is grounded in stored data: a card the catalog does not know is
 * invalid, and a rule whose data is missing leaves the list unverified rather
 * than passing it.
 */
@Injectable()
export class DeckLegalityService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(DeckFormat)
    private readonly formatRepository: Repository<DeckFormat>,
  ) {}

  /**
   * Checks a submitted list against its rule version and format.
   *
   * @param cards - Cards as submitted, with their quantities.
   * @param ruleVersion - Rule set the submission claims to follow.
   * @param formatId - Optional format whose active window is checked.
   * @returns Legality status with the errors and unverifiable rules found.
   */
  async validate(
    cards: SnapshotCardItem[],
    ruleVersion: string,
    formatId?: number | null,
  ): Promise<DeckLegalityResult> {
    const errors: string[] = [];
    const unknowns: string[] = [];
    const totalCards = cards.reduce(
      (sum, item) => sum + (item.quantity || 1),
      0,
    );

    if (totalCards !== REQUIRED_DECK_SIZE) {
      errors.push(
        `Un deck au format officiel doit comporter exactement ${REQUIRED_DECK_SIZE} cartes (actuellement ${totalCards}).`,
      );
    }

    const rules = KNOWN_RULE_VERSIONS[ruleVersion];
    if (!rules) {
      unknowns.push(
        `Le règlement ${ruleVersion} est inconnu : la légalité des cartes n'a pas pu être vérifiée.`,
      );
    }

    // A submitted identifier that is not even a catalog identity is refused
    // without querying: it cannot name a card the catalog holds.
    const submittedIds = [
      ...new Set(cards.map((card) => card.cardId).filter(Boolean)),
    ];
    const ids = submittedIds.filter((id) => isUUID(id));
    const known = ids.length
      ? await this.cardRepository.find({
          where: { id: In(ids) },
          relations: ["pokemonDetails"],
        })
      : [];
    const byId = new Map(known.map((card) => [card.id, card]));

    // Copies are counted per catalog card: a submission cannot dodge the limit
    // by repeating the same card under different names.
    const copiesById = new Map<string, number>();
    for (const item of cards) {
      copiesById.set(
        item.cardId,
        (copiesById.get(item.cardId) ?? 0) + (item.quantity || 1),
      );
    }

    for (const [cardId, copies] of copiesById.entries()) {
      const card = byId.get(cardId);
      if (!card) {
        errors.push(
          `La carte ${cardId} est introuvable dans le catalogue et ne peut pas être jouée.`,
        );
        continue;
      }

      const category = card.pokemonDetails?.category;
      const isBasicEnergy =
        category === PokemonCardsType.Energy &&
        !!card.pokemonDetails?.energyType;
      if (!category) {
        unknowns.push(
          `Le type de la carte ${cardId} est inconnu : la limite de copies n'a pas pu être vérifiée.`,
        );
      } else if (!isBasicEnergy && copies > MAX_COPIES_PER_CARD) {
        errors.push(
          `La carte ${cardId} est jouée en ${copies} exemplaires (maximum ${MAX_COPIES_PER_CARD}).`,
        );
      }

      if (rules) {
        const legality = card.legal?.[rules.legality];
        if (legality === undefined || legality === null) {
          unknowns.push(
            `La légalité ${rules.legality} de la carte ${cardId} est inconnue.`,
          );
        } else if (!legality) {
          errors.push(
            `La carte ${cardId} n'est pas autorisée en ${rules.legality}.`,
          );
        }
      }
    }

    if (formatId) {
      const format = await this.formatRepository.findOne({
        where: { id: formatId },
      });
      if (!format) {
        unknowns.push(
          `Le format #${formatId} est introuvable : sa période de validité n'a pas pu être vérifiée.`,
        );
      } else {
        const now = new Date();
        const start = format.startDate ? new Date(format.startDate) : null;
        const end = format.endDate ? new Date(format.endDate) : null;
        if ((start && now < start) || (end && now > end)) {
          errors.push(
            `Le format ${format.type} n'est pas actif à la date de soumission.`,
          );
        }
      }
    }

    const status = errors.length
      ? DeckLegalityStatus.INVALID
      : unknowns.length
        ? DeckLegalityStatus.UNVERIFIED
        : DeckLegalityStatus.VALID;

    return { status, errors, unknowns, totalCards };
  }
}
