import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CardGame } from "../common/enums/cardGame";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "../translation/supported-locales";
import { applyCardSearch } from "./card-search";
import { Card } from "./entities/card.entity";
import { CardTranslation } from "./entities/card-translation.entity";

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const EMBED_DIM = 512;

@Injectable()
export class CardService implements OnModuleInit {
  private readonly logger = new Logger(CardService.name);
  private embeddingReady = false;

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardTranslation)
    private readonly cardTranslationRepository: Repository<CardTranslation>,
  ) {}

  /**
   * Initializes pgvector extension and card embedding table if not present.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.cardRepository.query("CREATE EXTENSION IF NOT EXISTS vector");
      await this.cardRepository.query(
        `CREATE TABLE IF NOT EXISTS card_embedding (
           card_id uuid PRIMARY KEY REFERENCES card(id) ON DELETE CASCADE,
           embedding vector(${EMBED_DIM}),
           updated_at timestamptz DEFAULT now()
         )`,
      );
      await this.cardRepository.query(
        `CREATE INDEX IF NOT EXISTS card_embedding_hnsw
           ON card_embedding USING hnsw (embedding vector_cosine_ops)`,
      );
      this.embeddingReady = true;
    } catch (error) {
      this.logger.warn(
        `Visual search unavailable (pgvector not initialized): ${(error as Error).message}`,
      );
    }
  }

  /**
   * Performs fuzzy search by card name using pg_trgm trigram similarity, ignoring accents.
   *
   * @param term Name search term.
   * @param game Optional game filter.
   * @returns Array of matching cards.
   */
  async findByNameFuzzy(term: string, game?: CardGame): Promise<Card[]> {
    const t = stripAccents(term).trim();
    if (t.length < 3) return [];

    // Names live in localized translations: find best similarity across all languages
    // (e.g. scanned cards may be in English), then load matching cards preserving rank score order.
    const scored = await this.cardTranslationRepository
      .createQueryBuilder("ct")
      .select("ct.card_id", "cardId")
      .addSelect("MAX(similarity(immutable_unaccent(ct.name), :t))", "score")
      .innerJoin("card", "card", "card.id = ct.card_id")
      .where("immutable_unaccent(ct.name) % :t", { t })
      .groupBy("ct.card_id")
      .orderBy("score", "DESC")
      .limit(20);

    if (game) {
      scored.andWhere("card.game = :game", { game });
    }

    const rows = await scored.getRawMany<{ cardId: string }>();
    const ids = rows.map((row) => row.cardId);
    if (ids.length === 0) return [];

    const cards = await this.cardRepository.find({
      where: { id: In(ids) },
      relations: ["set", "pokemonDetails"],
    });

    const byId = new Map(cards.map((card) => [card.id, card]));
    return ids
      .map((id) => byId.get(id))
      .filter((card): card is Card => card !== undefined);
  }

  /**
   * Retrieves all cards, optionally filtered by card game.
   *
   * @param game Optional game filter.
   * @returns Array of cards.
   */
  async findAll(game?: CardGame): Promise<Card[]> {
    return this.cardRepository.find({
      where: game ? { game } : {},
      relations: ["set", "pokemonDetails"],
    });
  }

  /**
   * Finds a card by its unique identifier.
   *
   * @param id Card UUID.
   * @returns Card entity.
   */
  async findOne(id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ["set", "pokemonDetails"],
    });
    if (!card) {
      throw new Error(`Card with id ${id} not found`);
    }
    return card;
  }

  /**
   * Finds cards matching a set-relative local identifier.
   *
   * @param localId Local card number or identifier.
   * @param total Optional total set card count.
   * @param game Optional game filter.
   * @returns Array of matching cards.
   */
  async findByLocalId(
    localId: string,
    total?: string,
    game?: CardGame,
  ): Promise<Card[]> {
    const n = localId.trim();
    if (!n) return [];

    const numeric = Number(n);
    const variants = Array.from(
      new Set([n, String(numeric), n.padStart(3, "0")]),
    ).filter((v) => v && v !== "NaN");

    const base = () => {
      const qb = this.cardRepository
        .createQueryBuilder("card")
        .leftJoinAndSelect("card.set", "set")
        .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
        .where("card.localId IN (:...variants)", { variants });
      if (game) qb.andWhere("card.game = :game", { game });
      return qb;
    };

    const totalNum = Number(total);
    if (total && !Number.isNaN(totalNum)) {
      const withTotal = await base()
        .andWhere(
          "(set.cardCount.official = :total OR set.cardCount.total = :total)",
          { total: totalNum },
        )
        .take(80)
        .getMany();
      if (withTotal.length > 0) return withTotal;
    }

    return base().take(80).getMany();
  }

  /**
   * Finds cards visually similar to a given embedding vector using pgvector cosine distance.
   *
   * @param embedding Visual feature embedding vector.
   * @param game Optional game filter.
   * @param limit Maximum results to return.
   * @returns Array of cards with similarity scores.
   */
  async findByEmbedding(
    embedding: number[],
    game?: CardGame,
    limit = 10,
  ): Promise<Array<{ card: Card; similarity: number }>> {
    if (!embedding?.length || !this.embeddingReady) return [];
    const vec = `[${embedding.join(",")}]`;
    const params: unknown[] = [vec];
    let gameFilter = "";
    if (game) {
      params.push(game);
      gameFilter = `AND card.game = $${params.length}`;
    }
    params.push(limit);

    let rows: Array<{ id: string; similarity: string }>;
    try {
      rows = await this.cardRepository.query(
        `SELECT e.card_id AS id, 1 - (e.embedding <=> $1::vector) AS similarity
         FROM card_embedding e
         JOIN card ON card.id = e.card_id
         WHERE 1 = 1 ${gameFilter}
         ORDER BY e.embedding <=> $1::vector
         LIMIT $${params.length}`,
        params,
      );
    } catch (error) {
      // Visual search feature unavailable: log warning without crashing
      this.logger.warn(`Visual search error: ${(error as Error).message}`);
      return [];
    }
    if (rows.length === 0) return [];

    const cards = await this.cardRepository.find({
      where: { id: In(rows.map((r) => r.id)) },
      relations: ["set", "pokemonDetails"],
    });
    const byId = new Map(cards.map((c) => [c.id, c]));
    return rows
      .map((r) => ({ card: byId.get(r.id), similarity: Number(r.similarity) }))
      .filter((x): x is { card: Card; similarity: number } => Boolean(x.card));
  }

  /**
   * Calculates embedding similarity scores for a specific list of card IDs.
   *
   * @param embedding Target embedding vector.
   * @param cardIds Array of card IDs to score.
   * @returns Map of card ID to similarity score.
   */
  async embeddingSimilarities(
    embedding: number[],
    cardIds: string[],
  ): Promise<Map<string, number>> {
    if (!embedding?.length || !this.embeddingReady || cardIds.length === 0) {
      return new Map();
    }
    const vec = `[${embedding.join(",")}]`;
    try {
      const rows: Array<{ id: string; similarity: string }> =
        await this.cardRepository.query(
          `SELECT card_id AS id, 1 - (embedding <=> $1::vector) AS similarity
           FROM card_embedding
           WHERE card_id = ANY($2)`,
          [vec, cardIds],
        );
      return new Map(rows.map((r) => [r.id, Number(r.similarity)]));
    } catch (error) {
      this.logger.warn(
        `Visual similarity calculation failed: ${(error as Error).message}`,
      );
      return new Map();
    }
  }

  /**
   * Searches cards by a general query string.
   *
   * @param search Query string.
   * @param game Optional game filter.
   * @returns Matching cards.
   */
  async findBySearch(search: string, game?: CardGame): Promise<Card[]> {
    if (!search) return [];
    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails");

    if (game) {
      qb.where("card.game = :game", { game });
    }

    applyCardSearch(qb, search);

    return qb.getMany();
  }

  /**
   * Retrieves a paginated list of cards.
   *
   * @param page Page index (1-based).
   * @param limit Items per page.
   * @param game Optional game filter.
   * @returns Paginated card results.
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    game?: CardGame,
  ): Promise<PaginatedResult<Card>> {
    const { page: validPage, limit: validLimit } =
      PaginationHelper.validateParams({
        page,
        limit,
      });

    const offset = PaginationHelper.calculateOffset(validPage, validLimit);

    // Card names live in translations. The join is filtered on a single locale,
    // so it stays one-to-one and does not inflate the paginated row count.
    // A subquery in `orderBy` would be parsed as an alias by TypeORM.
    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .leftJoin(
        "card.translations",
        "sortTranslation",
        "sortTranslation.locale = :sortLocale",
        { sortLocale: DEFAULT_LOCALE },
      )
      .orderBy("sortTranslation.name", "ASC")
      // `offset`/`limit` rather than `skip`/`take`: the latter wraps the query
      // in a DISTINCT subquery that cannot see the joined sort column. Safe
      // here since every join is one-to-one.
      .offset(offset)
      .limit(validLimit);

    if (game) {
      qb.where("card.game = :game", { game });
    }

    const [data, totalItems] = await qb.getManyAndCount();

    return PaginationHelper.createPaginatedResult(
      data,
      totalItems,
      validPage,
      validLimit,
    );
  }

  /**
   * Returns a random card entity.
   *
   * @param game Optional game filter.
   * @returns Random card or null if dataset is empty.
   */
  async findRandom(game?: CardGame): Promise<Card | null> {
    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails");

    if (game) {
      qb.where("card.game = :game", { game });
    }

    const card = await qb.orderBy("RANDOM()").limit(1).getOne();
    return card ?? null;
  }

  /**
   * Retrieves unique card rarities contained within a specific expansion set.
   *
   * @param setId Expansion set ID.
   * @param locale Desired locale for translated rarity labels.
   * @returns Array of unique rarity strings.
   */
  async getSetRarities(
    setId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<string[]> {
    // Rarities are localized labels: return in requested locale with fallback to default locale if missing.
    const rows = await this.cardTranslationRepository
      .createQueryBuilder("ct")
      .select("DISTINCT(ct.rarity)", "rarity")
      .innerJoin("card", "card", "card.id = ct.card_id")
      .where("card.setId = :setId", { setId })
      .andWhere("ct.locale = :locale", { locale })
      .andWhere("ct.rarity IS NOT NULL")
      .getRawMany<{ rarity: string }>();

    if (rows.length === 0 && locale !== DEFAULT_LOCALE) {
      return this.getSetRarities(setId, DEFAULT_LOCALE);
    }

    return rows.map((row) => row.rarity).filter(Boolean);
  }
}
