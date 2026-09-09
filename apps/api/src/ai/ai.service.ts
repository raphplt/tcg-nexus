import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { DeckService } from "../deck/deck.service";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "../translation/supported-locales";
import type { User } from "../user/entities/user.entity";
import type { AnalyzePoolDto } from "./dto/analyze-pool.dto";
import type { DeckInsightsDto } from "./dto/deck-insights.dto";
import { DeckMetricsService } from "./engine/deck-metrics.service";
import {
  type CardSuggestion,
  DeckSimilarityService,
  type SimilarDeck,
  type SimilarityResult,
} from "./similarity/deck-similarity.service";

/**
 * Entry point of the deck intelligence module.
 *
 * Deck loading and visibility stay in `DeckService`; this service composes the
 * deterministic engine and the local similarity index on top of it.
 */
@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(DeckFormat)
    private readonly formatRepository: Repository<DeckFormat>,
    private readonly deckService: DeckService,
    private readonly deckMetrics: DeckMetricsService,
    private readonly similarity: DeckSimilarityService,
  ) {}

  /**
   * Analyzes a card pool that is not a persisted deck.
   *
   * @param dto Cards and their quantities, plus an optional format.
   * @param locale Locale to render diagnostics in.
   * @returns The same insight payload a persisted deck produces.
   * @throws BadRequestException If none of the submitted cards exist.
   */
  async analyzePool(
    dto: AnalyzePoolDto,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<DeckInsightsDto> {
    // Quantities are summed per card so a pool that repeats an identifier
    // instead of setting `qty` is counted the same way.
    const quantities = new Map<string, number>();
    for (const entry of dto.cards) {
      quantities.set(
        entry.cardId,
        (quantities.get(entry.cardId) ?? 0) + (entry.qty ?? 1),
      );
    }

    const cards = await this.cardRepository.find({
      where: { id: In([...quantities.keys()]) },
      relations: ["pokemonDetails"],
    });

    if (!cards.length) {
      throw new BadRequestException(
        "None of the provided cards exist in catalog.",
      );
    }

    const format = dto.formatId
      ? await this.formatRepository.findOneBy({ id: dto.formatId })
      : null;

    return this.deckMetrics.analyze(
      cards.map((card) => ({ card, qty: quantities.get(card.id) ?? 1 })),
      {
        formatId: format?.id ?? null,
        formatType: format?.type ?? null,
        locale,
      },
    );
  }

  /**
   * Lists the public decks closest to a deck's archetype.
   *
   * @param deckId Reference deck.
   * @param viewer Authenticated user, or undefined for anonymous callers.
   * @param limit Maximum neighbours to return.
   * @returns Neighbours, or an explained empty result.
   * @throws NotFoundException If the deck does not exist or is not visible.
   */
  async findSimilarDecks(
    deckId: number,
    viewer?: User,
    limit = 10,
  ): Promise<SimilarityResult<SimilarDeck>> {
    await this.deckService.findOneWithCards(deckId, viewer);
    await this.similarity.refreshDeckEmbedding(deckId);
    return this.similarity.findSimilarDecks(deckId, limit);
  }

  /**
   * Suggests cards that similar decks play and this one does not.
   *
   * @param deckId Reference deck.
   * @param viewer Authenticated user, or undefined for anonymous callers.
   * @param limit Maximum suggestions to return.
   * @param locale Locale used to resolve card names.
   * @returns Suggestions, or an explained empty result.
   * @throws NotFoundException If the deck does not exist or is not visible.
   */
  async suggestCards(
    deckId: number,
    viewer?: User,
    limit = 12,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<SimilarityResult<CardSuggestion>> {
    await this.deckService.findOneWithCards(deckId, viewer);
    await this.similarity.refreshDeckEmbedding(deckId);
    return this.similarity.suggestCards(deckId, limit, locale);
  }
}
