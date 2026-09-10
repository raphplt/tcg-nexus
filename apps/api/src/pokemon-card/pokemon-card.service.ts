import {
  applyCardSearch,
  applyRarityFilter,
  cardNameMatchesSql,
} from "../card/card-search";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { PokemonCardDetails } from "../card/entities/pokemon-card-details.entity";
import { CardGame } from "../common/enums/cardGame";
import { PokemonCardsType } from "../common/enums/pokemonCardsType";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { Repository } from "typeorm";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { CreatePokemonCardDto } from "./dto/create-pokemon-card.dto";
import { UpdatePokemonCardDto } from "./dto/update-pokemon-card.dto";

@Injectable()
export class PokemonCardService {
  /** Upper bound of the non-paginated card listing. */
  private static readonly MAX_FIND_ALL_CARDS = 500;

  constructor(
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly pokemonCardDetailsRepository: Repository<PokemonCardDetails>,
  ) {}

  private toPokemonCardResponse(card: Card) {
    const details = card.pokemonDetails;
    return {
      id: card.id,
      tcgDexId: card.tcgDexId,
      localId: card.localId,
      // Name, image, rarity, and category are attached by CatalogLocalizationInterceptor in request locale
      category: details?.category,
      illustrator: card.illustrator,
      variants: card.variants,
      variantsDetailed: card.variantsDetailed,
      set: card.set,
      legal: card.legal,
      updated: card.updated,
      pricing: card.pricing,
      dexId: details?.dexId,
      hp: details?.hp,
      types: details?.types,
      evolveFrom: details?.evolveFrom,
      description: details?.description,
      effect: details?.effect,
      level: details?.level,
      stage: details?.stage,
      suffix: details?.suffix,
      item: details?.item,
      abilities: details?.abilities,
      attacks: details?.attacks,
      weaknesses: details?.weaknesses,
      resistances: details?.resistances,
      retreat: details?.retreat,
      regulationMark: details?.regulationMark,
      trainerType: details?.trainerType,
      energyType: details?.energyType,
      boosters: details?.boosters,
    };
  }

  private async findOneEntity(id: string): Promise<Card> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id, game: CardGame.Pokemon },
      relations: ["set", "pokemonDetails"],
    });
    if (!card) {
      throw new Error(`Card with id ${id} not found`);
    }
    return card;
  }

  async create(
    createPokemonCardDto: CreatePokemonCardDto,
  ): Promise<Record<string, any>> {
    const {
      set,
      setId,
      category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters,
      ...baseFields
    } = createPokemonCardDto;

    const newCard = this.pokemonCardRepository.create({
      ...baseFields,
      game: CardGame.Pokemon,
      category,
      set: set?.id
        ? ({ id: set.id } as PokemonSet)
        : setId
          ? ({ id: setId } as PokemonSet)
          : undefined,
    });

    const details = this.pokemonCardDetailsRepository.create({
      category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters,
    });

    details.card = newCard;
    newCard.pokemonDetails = details;
    const savedCard = await this.pokemonCardRepository.save(newCard);
    return this.toPokemonCardResponse(savedCard);
  }

  /**
   * Lists Pokémon cards, capped to keep the response bounded.
   *
   * NOTE: unbounded, this serialized the whole catalogue — around 33 MB and
   * fifteen seconds per call. Callers that need the full catalogue must page
   * through `findAllPaginated`.
   *
   * @param limit - Maximum number of cards returned, clamped to `MAX_FIND_ALL_CARDS`.
   * @returns Serialized cards.
   */
  async findAll(
    limit: number = PokemonCardService.MAX_FIND_ALL_CARDS,
  ): Promise<Record<string, any>[]> {
    const cards = await this.pokemonCardRepository.find({
      where: { game: CardGame.Pokemon },
      relations: ["set", "pokemonDetails"],
      take: Math.min(Math.max(1, limit), PokemonCardService.MAX_FIND_ALL_CARDS),
    });
    return cards.map((card) => this.toPokemonCardResponse(card));
  }

  async findOne(id: string): Promise<Record<string, any>> {
    const card = await this.findOneEntity(id);
    return this.toPokemonCardResponse(card);
  }

  /**
   * Searches Pokémon cards by matching names or keywords.
   *
   * @param search - Search query term.
   * @param limit - Optional upper bound on results returned.
   * @returns Array of serialized card responses.
   */
  async findBySearch(
    search: string,
    limit?: number,
  ): Promise<Record<string, any>[]> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon });

    if (!search) {
      return [];
    }

    applyCardSearch(qb, search);

    if (limit !== undefined && limit > 0) {
      qb.limit(Math.min(limit, 100));
    }

    const cards = await qb.getMany();
    return cards.map((card) => this.toPokemonCardResponse(card));
  }

  async update(
    id: string,
    updatePokemonCardDto: UpdatePokemonCardDto,
  ): Promise<Record<string, any>> {
    const card = await this.findOneEntity(id);
    const {
      set,
      setId,
      category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters,
      ...baseFields
    } = updatePokemonCardDto;

    if (updatePokemonCardDto.set?.id) {
      card.set = { id: updatePokemonCardDto.set.id } as PokemonSet;
    } else if (setId) {
      card.set = { id: setId } as PokemonSet;
    }

    this.pokemonCardRepository.merge(card, {
      ...baseFields,
      category: category ?? card.category,
      set: card.set,
    });

    if (!card.pokemonDetails) {
      card.pokemonDetails = this.pokemonCardDetailsRepository.create({ card });
    }

    Object.assign(card.pokemonDetails, {
      category: category ?? card.pokemonDetails.category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters,
    });
    const savedCard = await this.pokemonCardRepository.save(card);
    return this.toPokemonCardResponse(savedCard);
  }

  async remove(id: string): Promise<void> {
    await this.pokemonCardRepository.delete(id);
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string,
    setId?: string,
    serieId?: string,
    rarity?: string,
    type?: string,
  ): Promise<PaginatedResult<Record<string, any>>> {
    const { page: validPage, limit: validLimit } =
      PaginationHelper.validateParams({ page, limit });

    const offset = PaginationHelper.calculateOffset(validPage, validLimit);

    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoin("set.serie", "serie")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon });

    if (search && search.trim() !== "") {
      applyCardSearch(qb, search);
    }

    if (setId && setId.trim() !== "") {
      qb.andWhere("set.id = :setId", { setId });
    }

    if (serieId && serieId.trim() !== "") {
      qb.andWhere("serie.id = :serieId", { serieId });
    }

    if (rarity && rarity.trim() !== "") {
      applyRarityFilter(qb, rarity);
    }

    if (type && type.trim() !== "") {
      qb.andWhere(":type = ANY(pokemonDetails.types)", { type });
    }

    qb.orderBy("set.releaseDate", "DESC")
      .addOrderBy(
        "CAST(NULLIF(regexp_replace(\"localId\", '\\D', '', 'g'), '') AS INTEGER)",
        "ASC",
      )
      .addOrderBy("card.localId", "ASC");

    qb.limit(validLimit).offset(offset);

    const [data, totalItems] = await Promise.all([qb.getMany(), qb.getCount()]);

    return PaginationHelper.createPaginatedResult(
      data.map((card) => this.toPokemonCardResponse(card)),
      totalItems,
      validPage,
      validLimit,
    );
  }

  /**
   * Retrieves a random Pokémon card matching optional criteria.
   *
   * @param serieId Optional series identifier.
   * @param rarity Optional rarity name.
   * @param setId Optional set identifier.
   * @param category Optional card category (e.g. Pokemon).
   * @param excludeIds Optional card IDs to exclude.
   * @returns Localized card entity or null.
   */
  async findRandom(
    serieId?: string,
    rarity?: string,
    setId?: string,
    category?: PokemonCardsType,
    excludeIds?: string[],
  ): Promise<Record<string, any> | null> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder("pokemonCard")
      .leftJoinAndSelect("pokemonCard.set", "pokemonSet")
      .leftJoin("pokemonSet.serie", "pokemonSerie")
      .leftJoinAndSelect("pokemonCard.pokemonDetails", "pokemonDetails")
      .where("pokemonCard.game = :game", { game: CardGame.Pokemon });

    if (serieId && serieId.trim() !== "") {
      qb.andWhere("pokemonSerie.id = :serieId", { serieId });
    }

    if (rarity && rarity.trim() !== "") {
      applyRarityFilter(qb, rarity, { alias: "pokemonCard" });
    }

    if (setId && setId.trim() !== "") {
      qb.andWhere("pokemonSet.id = :setId", { setId });
    }

    if (category) {
      qb.andWhere("pokemonDetails.category = :category", { category });
    }

    if (excludeIds && excludeIds.length > 0) {
      qb.andWhere("pokemonCard.id NOT IN (:...excludeIds)", { excludeIds });
    }

    const card = await qb.orderBy("RANDOM()").limit(1).getOne();
    return card ? this.toPokemonCardResponse(card) : null;
  }

  /**
   * Retrieves a random sample of distinct Pokémon species for mini-game distractors.
   *
   * Each entry represents a unique Pokémon by primary National Pokédex number,
   * filtered to Pokémon category. Names are resolved by CatalogLocalizationInterceptor
   * using the card identifier and tcgDexId.
   *
   * @param count Number of distinct species to draw (capped between 1 and 100).
   * @returns Array of species items with id, tcgDexId, dexId and types.
   */
  async findRandomSpecies(count = 40): Promise<Record<string, any>[]> {
    const validCount = Math.max(1, Math.min(100, count));
    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .innerJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon })
      .andWhere("pokemonDetails.category = :category", {
        category: PokemonCardsType.Pokemon,
      })
      .andWhere("pokemonDetails.dexId IS NOT NULL")
      .orderBy("RANDOM()")
      .limit(validCount * 4);

    const cards = await qb.getMany();
    const seenDex = new Set<number>();
    const species: Record<string, any>[] = [];

    for (const card of cards) {
      const primaryDexId = card.pokemonDetails?.dexId?.[0];
      if (primaryDexId === undefined || seenDex.has(primaryDexId)) {
        continue;
      }
      seenDex.add(primaryDexId);
      species.push({
        id: card.id,
        tcgDexId: card.tcgDexId,
        dexId: primaryDexId,
        types: card.pokemonDetails?.types ?? [],
      });
      if (species.length >= validCount) {
        break;
      }
    }

    return species;
  }

  /**
   * Retrieves the deterministic daily Pokémon species card for Pokedle.
   *
   * @param dateStr - Target date string (YYYY-MM-DD). Defaults to current UTC date.
   * @returns Serialized card response or null if unavailable.
   */
  async getDailySpecies(dateStr?: string): Promise<Record<string, any> | null> {
    const targetDate = dateStr || new Date().toISOString().split("T")[0];

    let hash = 0;
    for (let i = 0; i < targetDate.length; i++) {
      hash = (hash << 5) - hash + targetDate.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .innerJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .leftJoinAndSelect("card.set", "set")
      .where("card.game = :game", { game: CardGame.Pokemon })
      .andWhere("pokemonDetails.category = :category", {
        category: PokemonCardsType.Pokemon,
      })
      .andWhere("pokemonDetails.dexId IS NOT NULL");

    const total = await qb.getCount();
    if (total === 0) {
      return null;
    }

    const offset = seed % total;
    const card = await qb
      .orderBy("card.id", "ASC")
      .skip(offset)
      .take(1)
      .getOne();

    return card ? this.toPokemonCardResponse(card) : null;
  }

  /**
   * Matches candidate cards against OCR-extracted scanner data.
   *
   * Scoring strategy:
   *
   * STEP 1 — Prioritized AND query:
   *   If both NAME and NUMBER are provided, query cards matching BOTH first.
   *   → Abra with localId 063 → matched directly with high combined score (230).
   *
   * STEP 2 — Fallback OR query:
   *   If no match is found via AND, query by NAME or NUMBER independently.
   *
   * Score table:
   *   exact localId           → +60
   *   exact name              → +50
   *   COMBINED BONUS (both)   → +120
   *   set name match          → +15
   *   → Abra 063 = 60+50+120 = 230
   *   → Machop 063 = 60 only  = 60
   */
  async findByScanMatch(params: {
    cardName?: string;
    localId?: string;
    setName?: string;
    setNumber?: string;
    setTotal?: string;
  }): Promise<{ card: Record<string, any>; score: number }[]> {
    const { cardName, localId, setName, setNumber } = params;

    const norm = (v: string | undefined): string =>
      (v || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    // LocalId variations: "063" → ["063", "63"] to support database records stored with or without leading zero padding
    const rawLocalId = (localId || setNumber || "").trim();
    const localIdVariants: string[] = [];
    if (rawLocalId) {
      localIdVariants.push(rawLocalId);
      const n = parseInt(rawLocalId, 10);
      if (!isNaN(n)) {
        const withoutPad = String(n);
        const withPad3 = String(n).padStart(3, "0");
        if (withoutPad !== rawLocalId) localIdVariants.push(withoutPad);
        if (withPad3 !== rawLocalId && withPad3 !== withoutPad)
          localIdVariants.push(withPad3);
      }
    }

    // ── STEP 1: Strict AND query (name + set number combined) ─────────────
    let cards: Card[] = [];

    if (cardName?.trim() && localIdVariants.length > 0) {
      const andParams: Record<string, string> = {};
      andParams.game = CardGame.Pokemon;
      andParams.cardName = `%${cardName.trim()}%`;

      const localIdConds = localIdVariants.map((v, i) => {
        andParams[`lid${i}`] = v;
        return `card.localId = :lid${i}`;
      });

      const andQb = this.pokemonCardRepository
        .createQueryBuilder("card")
        .leftJoinAndSelect("card.set", "set")
        .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
        .where("card.game = :game", { game: andParams.game })
        .andWhere(cardNameMatchesSql("card", "cardName"), {
          cardName: String(andParams.cardName).toLowerCase(),
        })
        .andWhere(`(${localIdConds.join(" OR ")})`, andParams)
        .limit(5);

      cards = await andQb.getMany();
    }

    // ── STEP 2: Fallback OR query if no match ──────────────────────────────
    if (cards.length === 0) {
      const orConditions: string[] = [];
      const orParams: Record<string, string> = {};

      if (cardName?.trim()) {
        orConditions.push(cardNameMatchesSql("card", "cardName"));
        orParams.cardName = `%${cardName.trim().toLowerCase()}%`;
      }

      if (localIdVariants.length > 0) {
        const lidConds = localIdVariants.flatMap((v, i) => {
          const exactKey = `lidExact${i}`;
          const likeKey = `lidLike${i}`;
          orParams[exactKey] = v;
          orParams[likeKey] = `%${v}%`;
          return [
            `card.localId = :${exactKey}`,
            `card.localId ILIKE :${likeKey}`,
          ];
        });
        orConditions.push(`(${lidConds.join(" OR ")})`);
      }

      if (setName?.trim()) {
        // Set names live in translations, matched across every locale.
        orConditions.push(`EXISTS (
          SELECT 1 FROM pokemon_set_translation st
          WHERE st.set_id = "card"."setId" AND st.name ILIKE :setName
        )`);
        orParams.setName = `%${setName.trim()}%`;
      }

      if (orConditions.length === 0) return [];

      const orQb = this.pokemonCardRepository
        .createQueryBuilder("card")
        .leftJoinAndSelect("card.set", "set")
        .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
        .where("card.game = :game", { game: CardGame.Pokemon })
        .andWhere(`(${orConditions.join(" OR ")})`, orParams)
        .limit(25);

      cards = await orQb.getMany();
    }

    if (cards.length === 0) return [];

    // ── Scoring ─────────────────────────────────────────────────────────
    const nTargetName = norm(cardName);
    const nTargetSet = norm(setName);
    const nLocalIdVariants = localIdVariants.map(norm);

    const scored = cards.map((card) => {
      let score = 0;

      const nName = norm(card.name);
      const nLocalId = norm(card.localId);
      const nSet = norm(card.set?.name);

      // LocalId matching
      const localIdExact = nLocalIdVariants.some((v) => v && nLocalId === v);
      const localIdPartial =
        !localIdExact &&
        nLocalIdVariants.some((v) => v && nLocalId.includes(v));

      if (localIdExact) score += 60;
      else if (localIdPartial) score += 30;

      // Card Name matching
      const nameExact = nTargetName && nName === nTargetName;
      const nameContains =
        !nameExact && nTargetName && nName.includes(nTargetName);
      const namePartial =
        !nameExact &&
        !nameContains &&
        nTargetName &&
        nTargetName.includes(nName) &&
        nName.length > 3;

      if (nameExact) score += 50;
      else if (nameContains) score += 30;
      else if (namePartial) score += 20;

      // Combined Bonus (Bonus applied when both card name and localId match)
      const hasName = nameExact || nameContains || namePartial;
      const hasLocalId = localIdExact || localIdPartial;
      if (hasName && hasLocalId) score += 120;

      // Set name
      if (nTargetSet && nSet) {
        if (nSet.includes(nTargetSet)) score += 15;
        else if (nTargetSet.includes(nSet) && nSet.length > 3) score += 10;
      }

      return { card: this.toPokemonCardResponse(card), score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}
