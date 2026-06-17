import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import { CardGame } from "src/common/enums/cardGame";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { Repository } from "typeorm";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { CreatePokemonCardDto } from "./dto/create-pokemon-card.dto";
import { UpdatePokemonCardDto } from "./dto/update-pokemon-card.dto";

@Injectable()
export class PokemonCardService {
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
      name: card.name,
      image: card.image,
      category: details?.category ?? card.category,
      illustrator: card.illustrator,
      rarity: card.rarity,
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

  async findAll(): Promise<Record<string, any>[]> {
    const cards = await this.pokemonCardRepository.find({
      where: { game: CardGame.Pokemon },
      relations: ["set", "pokemonDetails"],
    });
    return cards.map((card) => this.toPokemonCardResponse(card));
  }

  async findOne(id: string): Promise<Record<string, any>> {
    const card = await this.findOneEntity(id);
    return this.toPokemonCardResponse(card);
  }

  async findBySearch(search: string): Promise<Record<string, any>[]> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon });

    if (!search) {
      return [];
    }

    qb.andWhere(
      "(card.name ILIKE :search OR card.rarity ILIKE :search OR set.name ILIKE :search OR pokemonDetails.description ILIKE :search)",
      { search: `%${search}%` },
    );

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
      qb.andWhere(
        "(card.name ILIKE :search OR card.rarity ILIKE :search OR set.name ILIKE :search OR pokemonDetails.description ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (setId && setId.trim() !== "") {
      qb.andWhere("set.id = :setId", { setId });
    }

    if (serieId && serieId.trim() !== "") {
      qb.andWhere("serie.id = :serieId", { serieId });
    }

    if (rarity && rarity.trim() !== "") {
      qb.andWhere("card.rarity = :rarity", { rarity });
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

  async findRandom(
    serieId?: string,
    rarity?: string,
    setId?: string,
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
      qb.andWhere("pokemonCard.rarity = :rarity", { rarity });
    }

    if (setId && setId.trim() !== "") {
      qb.andWhere("pokemonSet.id = :setId", { setId });
    }

    const card = await qb.orderBy("RANDOM()").limit(1).getOne();
    return card ? this.toPokemonCardResponse(card) : null;
  }

  /**
   * Trouve les meilleures cartes correspondant aux données OCR.
   *
   * Stratégie de scoring (pourquoi "Abra 063" ne peut pas retourner "Machop 063") :
   *
   * ÉTAPE 1 — Requête AND prioritaire :
   *   Si on a NOM + NUMÉRO → on cherche d'abord les cartes qui ont les DEUX.
   *   → Abra avec localId 063 → trouvé directement, score 230 (60+50+120 bonus combiné)
   *
   * ÉTAPE 2 — Fallback OR :
   *   Si rien trouvé en AND, on cherche par NOM ou NUMÉRO séparément.
   *
   * Tableau des scores :
   *   localId exact           → +60
   *   nom exact               → +50
   *   BONUS COMBINÉ (les 2)  → +120   ← clé du fix
   *   set name match          → +15
   *   → Abra 063 = 60+50+120 = 230
   *   → Machop 063 = 60 seul  = 60
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

    // Variantes du localId : "063" → ["063", "63"]
    // pour gérer les BDD qui stockent avec ou sans padding
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

    // ── ÉTAPE 1 : requête AND (nom + numéro ensemble) ────────────────────
    // Plus précise — si les deux critères sont disponibles
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
        .andWhere("card.name ILIKE :cardName", { cardName: andParams.cardName })
        .andWhere(`(${localIdConds.join(" OR ")})`, andParams)
        .limit(5);

      cards = await andQb.getMany();
    }

    // ── ÉTAPE 2 : fallback OR si rien trouvé ────────────────────────────
    if (cards.length === 0) {
      const orConditions: string[] = [];
      const orParams: Record<string, string> = {};

      if (cardName?.trim()) {
        orConditions.push("card.name ILIKE :cardName");
        orParams.cardName = `%${cardName.trim()}%`;
      }

      if (localIdVariants.length > 0) {
        const lidConds = localIdVariants.flatMap((v, i) => {
          const exactKey = `lidExact${i}`;
          const likeKey = `lidLike${i}`;
          orParams[exactKey] = v;
          orParams[likeKey] = `%${v}%`;
          return [`card.localId = :${exactKey}`, `card.localId ILIKE :${likeKey}`];
        });
        orConditions.push(`(${lidConds.join(" OR ")})`);
      }

      if (setName?.trim()) {
        orConditions.push("set.name ILIKE :setName");
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

      // LocalId
      const localIdExact = nLocalIdVariants.some((v) => v && nLocalId === v);
      const localIdPartial = !localIdExact && nLocalIdVariants.some((v) => v && nLocalId.includes(v));

      if (localIdExact) score += 60;
      else if (localIdPartial) score += 30;

      // Nom
      const nameExact = nTargetName && nName === nTargetName;
      const nameContains = !nameExact && nTargetName && nName.includes(nTargetName);
      const namePartial = !nameExact && !nameContains && nTargetName && nTargetName.includes(nName) && nName.length > 3;

      if (nameExact) score += 50;
      else if (nameContains) score += 30;
      else if (namePartial) score += 20;

      // ★ BONUS COMBINÉ — le cœur du fix ★
      // Seule une carte qui a à la fois le bon nom ET le bon numéro reçoit ce bonus.
      // "Abra 063" → score 60+50+120 = 230
      // "Machop 063" → score 60 seulement
      // "Abra 025" → score 50 seulement (si OCR donne 063 comme numéro)
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
