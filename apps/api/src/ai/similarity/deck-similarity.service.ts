import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Deck } from "../../deck/entities/deck.entity";

/** A deck close to the reference deck in archetype space. */
export interface SimilarDeck {
  deckId: number;
  name: string;
  /** Cosine similarity, 0-1. */
  similarity: number;
  cardCount: number;
}

/** A card the neighbouring decks play and the reference deck does not. */
export interface CardSuggestion {
  cardId: string;
  name: string | null;
  image: string | null;
  /** How many neighbours play it. */
  deckCount: number;
  /** Share of the neighbours that play it, 0-100. */
  adoption: number;
  /** Average copies among the neighbours that play it. */
  averageQty: number;
}

/** Similarity output, including why it may be empty. */
export interface SimilarityResult<T> {
  available: boolean;
  /** Set when `available` is false, so the client can say what is missing. */
  reason?: "pgvector-missing" | "deck-not-vectorized" | "no-neighbours";
  items: T[];
}

/** Neighbours considered when mining card suggestions. */
const NEIGHBOUR_POOL = 25;

/**
 * Deck similarity and card suggestions, computed entirely in PostgreSQL.
 *
 * A deck's archetype vector is the quantity-weighted mean of its cards' visual
 * embeddings — the ones `npm run embed:cards` already stores. Nothing leaves
 * the database, and every method degrades to an empty, explained result when
 * pgvector or the vectors themselves are missing.
 */
@Injectable()
export class DeckSimilarityService {
  private readonly logger = new Logger(DeckSimilarityService.name);

  constructor(
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
  ) {}

  /**
   * Recomputes and stores a deck's archetype vector from its cards.
   *
   * @param deckId Deck to vectorize.
   * @returns How many of the deck's cards had an embedding to average.
   */
  async refreshDeckEmbedding(
    deckId: number,
  ): Promise<{ stored: boolean; coveredCards: number; cardCount: number }> {
    try {
      const rows = await this.deckRepository.query(
        `WITH weighted AS (
           SELECT dc."cardId", dc.qty, ce.embedding
           FROM deck_card dc
           JOIN card_embedding ce ON ce.card_id = dc."cardId"
           WHERE dc."deckId" = $1
         ),
         totals AS (
           SELECT
             (SELECT COALESCE(SUM(qty), 0) FROM deck_card WHERE "deckId" = $1) AS card_count,
             COALESCE(SUM(qty), 0) AS covered_cards
           FROM weighted
         )
         INSERT INTO deck_embedding (deck_id, embedding, card_count, covered_cards, deck_updated_at, updated_at)
         SELECT
           $1,
           (SELECT AVG(embedding) FROM weighted),
           totals.card_count,
           totals.covered_cards,
           (SELECT "updatedAt" FROM deck WHERE id = $1),
           now()
         FROM totals
         WHERE totals.covered_cards > 0
         ON CONFLICT (deck_id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           card_count = EXCLUDED.card_count,
           covered_cards = EXCLUDED.covered_cards,
           deck_updated_at = EXCLUDED.deck_updated_at,
           updated_at = now()
         RETURNING card_count, covered_cards`,
        [deckId],
      );

      const row = rows[0];
      return {
        stored: !!row,
        coveredCards: Number(row?.covered_cards ?? 0),
        cardCount: Number(row?.card_count ?? 0),
      };
    } catch (error) {
      this.logger.warn(
        `Deck ${deckId} not vectorized: ${(error as Error).message}`,
      );
      return { stored: false, coveredCards: 0, cardCount: 0 };
    }
  }

  /**
   * Finds the public decks closest to a deck in archetype space.
   *
   * @param deckId Reference deck.
   * @param limit Maximum neighbours to return.
   * @returns Neighbours ordered by decreasing similarity.
   */
  async findSimilarDecks(
    deckId: number,
    limit = 10,
  ): Promise<SimilarityResult<SimilarDeck>> {
    try {
      const rows = await this.deckRepository.query(
        `SELECT
           d.id AS deck_id,
           d.name,
           de.card_count,
           1 - (de.embedding <=> reference.embedding) AS similarity
         FROM deck_embedding de
         JOIN deck d ON d.id = de.deck_id
         CROSS JOIN (
           SELECT embedding FROM deck_embedding WHERE deck_id = $1
         ) AS reference
         WHERE de.deck_id <> $1 AND d."isPublic" = true
         ORDER BY de.embedding <=> reference.embedding
         LIMIT $2`,
        [deckId, limit],
      );

      if (!rows.length) {
        return {
          available: true,
          reason: "no-neighbours",
          items: [],
        };
      }

      return {
        available: true,
        items: rows.map(
          (row: Record<string, unknown>): SimilarDeck => ({
            deckId: Number(row.deck_id),
            name: String(row.name ?? ""),
            similarity: Number(Number(row.similarity).toFixed(4)),
            cardCount: Number(row.card_count ?? 0),
          }),
        ),
      };
    } catch (error) {
      return this.unavailable(deckId, error as Error);
    }
  }

  /**
   * Mines the neighbouring decks for cards the reference deck does not play.
   *
   * The justification is the adoption rate itself: a card is proposed because a
   * measurable share of similar decks runs it, not because a model said so.
   *
   * @param deckId Reference deck.
   * @param limit Maximum suggestions to return.
   * @param locale Locale used to resolve card names.
   * @returns Suggestions ordered by decreasing adoption.
   */
  async suggestCards(
    deckId: number,
    limit = 12,
    locale = "fr",
  ): Promise<SimilarityResult<CardSuggestion>> {
    try {
      const rows = await this.deckRepository.query(
        `WITH reference AS (
           SELECT embedding FROM deck_embedding WHERE deck_id = $1
         ),
         neighbours AS (
           SELECT de.deck_id
           FROM deck_embedding de
           JOIN deck d ON d.id = de.deck_id
           CROSS JOIN reference
           WHERE de.deck_id <> $1 AND d."isPublic" = true
           ORDER BY de.embedding <=> reference.embedding
           LIMIT $2
         ),
         owned AS (
           SELECT "cardId" FROM deck_card WHERE "deckId" = $1
         )
         SELECT
           dc."cardId" AS card_id,
           ct.name,
           ct.image,
           COUNT(DISTINCT dc."deckId")::int AS deck_count,
           AVG(dc.qty)::float AS average_qty,
           (SELECT COUNT(*)::int FROM neighbours) AS neighbour_count
         FROM deck_card dc
         JOIN neighbours n ON n.deck_id = dc."deckId"
         LEFT JOIN card_translation ct
           ON ct.card_id = dc."cardId" AND ct.locale = $4
         WHERE dc."cardId" NOT IN (SELECT "cardId" FROM owned)
         GROUP BY dc."cardId", ct.name, ct.image
         ORDER BY deck_count DESC, average_qty DESC
         LIMIT $3`,
        [deckId, NEIGHBOUR_POOL, limit, locale],
      );

      if (!rows.length) {
        return { available: true, reason: "no-neighbours", items: [] };
      }

      const neighbourCount = Number(rows[0].neighbour_count) || 1;

      return {
        available: true,
        items: rows.map(
          (row: Record<string, unknown>): CardSuggestion => ({
            cardId: String(row.card_id),
            name: (row.name as string) ?? null,
            image: (row.image as string) ?? null,
            deckCount: Number(row.deck_count),
            adoption: Math.round(
              (Number(row.deck_count) / neighbourCount) * 100,
            ),
            averageQty: Number(Number(row.average_qty).toFixed(1)),
          }),
        ),
      };
    } catch (error) {
      return this.unavailable(deckId, error as Error);
    }
  }

  /**
   * Turns a database failure into an explained empty result.
   *
   * A missing `deck_embedding` table or `vector` extension is an installation
   * state, not a server error: the caller gets an empty list and a reason.
   */
  private unavailable<T>(deckId: number, error: Error): SimilarityResult<T> {
    const missingInfrastructure =
      /relation .*(deck_embedding|card_embedding).* does not exist/i.test(
        error.message,
      ) || /type "vector" does not exist/i.test(error.message);

    if (!missingInfrastructure) {
      this.logger.warn(
        `Deck ${deckId} similarity query failed: ${error.message}`,
      );
    }

    return {
      available: false,
      reason: missingInfrastructure
        ? "pgvector-missing"
        : "deck-not-vectorized",
      items: [],
    };
  }
}
