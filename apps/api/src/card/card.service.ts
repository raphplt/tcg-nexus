import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CardGame } from "../common/enums/cardGame";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { Card } from "./entities/card.entity";

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
  ) {}

  // cr\u00e9e pgvector + la table d'embeddings si absentes (portable : aucune \u00e9tape
  // manuelle sur une nouvelle base). Si pgvector n'est pas dispo, on log et la
  // recherche visuelle reste simplement inactive.
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
        `Recherche visuelle indisponible (pgvector non initialis\u00e9): ${(error as Error).message}`,
      );
    }
  }

  // recherche fuzzy par nom (trigrammes pg_trgm) tolérant fautes d'OCR et accents.
  // les noms en base sont sans accents, on retire donc les accents du terme.
  async findByNameFuzzy(term: string, game?: CardGame): Promise<Card[]> {
    const t = stripAccents(term).trim();
    if (t.length < 3) return [];

    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.name % :t", { t })
      .orderBy("similarity(card.name, :t)", "DESC")
      .limit(20);

    if (game) {
      qb.andWhere("card.game = :game", { game });
    }

    return qb.getMany();
  }

  async findAll(game?: CardGame): Promise<Card[]> {
    return this.cardRepository.find({
      where: game ? { game } : {},
      relations: ["set", "pokemonDetails"],
    });
  }

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
      // base visuelle absente/incohérente -> on ignore le visuel sans planter
      this.logger.warn(`Recherche visuelle KO: ${(error as Error).message}`);
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
      this.logger.warn(`Similarités visuelles KO: ${(error as Error).message}`);
      return new Map();
    }
  }

  async findBySearch(search: string, game?: CardGame): Promise<Card[]> {
    if (!search) return [];
    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails");

    if (game) {
      qb.where("card.game = :game", { game });
    }

    qb.andWhere(
      "(card.name ILIKE :search OR card.rarity ILIKE :search OR set.name ILIKE :search OR pokemonDetails.description ILIKE :search OR card.localId ILIKE :search)",
      { search: `%${search}%` },
    );

    return qb.getMany();
  }

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

    const [data, totalItems] = await this.cardRepository.findAndCount({
      where: game ? { game } : {},
      relations: ["set", "pokemonDetails"],
      skip: offset,
      take: validLimit,
      order: { name: "ASC" },
    });

    return PaginationHelper.createPaginatedResult(
      data,
      totalItems,
      validPage,
      validLimit,
    );
  }

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
}
