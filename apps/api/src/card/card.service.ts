import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CardGame } from "../common/enums/cardGame";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { Card } from "./entities/card.entity";

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
  ) {}

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

  // récupération par numéro de carte (localId), robuste au bruit OCR sur le nom.
  // si le dénominateur imprimé est connu, on filtre par cardCountOfficial
  // (= partie droite du "131/182"), ce qui cible directement la bonne série.
  async findByLocalId(
    localId: string,
    total?: string,
    game?: CardGame,
  ): Promise<Card[]> {
    const n = localId.trim();
    if (!n) return [];

    // variantes avec/sans zéros de tête (ex. "086" <-> "86")
    const numeric = Number(n);
    const variants = Array.from(
      new Set([n, String(numeric), n.padStart(3, "0")]),
    ).filter((v) => v && v !== "NaN");

    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.localId IN (:...variants)", { variants });

    const totalNum = Number(total);
    if (total && !Number.isNaN(totalNum)) {
      qb.andWhere(
        "(set.cardCount.official = :total OR set.cardCount.total = :total)",
        { total: totalNum },
      );
    }

    if (game) {
      qb.andWhere("card.game = :game", { game });
    }

    return qb.take(80).getMany();
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
