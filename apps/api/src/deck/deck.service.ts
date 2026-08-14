import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/common/enums/user";
import { In, Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { DeckCardRole } from "../common/enums/deckCardRole";
import { PokemonCardsType } from "../common/enums/pokemonCardsType";
import { DeckCard } from "../deck-card/entities/deck-card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { PaginationHelper } from "../helpers/pagination";
import { User } from "../user/entities/user.entity";
import {
  AnalyzeDeckResultDto,
  MissingCardSuggestionDto,
} from "./dto/analyze-deck-result.dto";
import { CreateDeckDto } from "./dto/create-deck.dto";
import { ImportDeckJsonDto } from "./dto/import-deck-json.dto";
import { ShareDeckDto } from "./dto/share-deck.dto";
import { UpdateDeckDto } from "./dto/update-deck.dto";
import { Deck } from "./entities/deck.entity";
import { DeckShare } from "./entities/deck-share.entity";
import { SavedDeck } from "./entities/saved-deck.entity";
import {
  DeckSortBy,
  FindAllDecksQueryDto,
} from "./dto/find-all-decks-query.dto";

export type FindAllDecksParams = FindAllDecksQueryDto;

// TypeORM injecte l'expression orderBy telle quelle : jamais la construire
// à partir de l'entrée utilisateur
const DECK_SORT_COLUMNS: Record<DeckSortBy, string> = {
  [DeckSortBy.CREATED_AT]: "deck.createdAt",
  [DeckSortBy.UPDATED_AT]: "deck.updatedAt",
  [DeckSortBy.NAME]: "deck.name",
  [DeckSortBy.VIEWS]: "deck.views",
  [DeckSortBy.FORMAT_TYPE]: "format.type",
};

const SAVED_DECK_SORT_COLUMNS: Record<DeckSortBy, string> = {
  ...DECK_SORT_COLUMNS,
  [DeckSortBy.CREATED_AT]: "savedDeck.createdAt",
};

const resolveDeckSortColumn = (
  sortBy: DeckSortBy | undefined,
  columns: Record<DeckSortBy, string> = DECK_SORT_COLUMNS,
): string => columns[sortBy as DeckSortBy] ?? columns[DeckSortBy.CREATED_AT];

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(DeckCard)
    private readonly deckCardRepo: Repository<DeckCard>,
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    @InjectRepository(DeckFormat)
    private readonly formatRepo: Repository<DeckFormat>,
    @InjectRepository(Deck)
    private readonly decksRepository: Repository<Deck>,
    @InjectRepository(DeckShare)
    private readonly deckShareRepo: Repository<DeckShare>,
    @InjectRepository(SavedDeck)
    private readonly savedDeckRepo: Repository<SavedDeck>,
    private readonly localization: CatalogLocalizationService,
  ) {}
  /**
   * Creates a new deck for a user along with its card compositions.
   *
   * @param user Owner user entity.
   * @param dto Deck creation payload.
   * @returns Newly created Deck entity with cards.
   */
  async createDeck(user: User, dto: CreateDeckDto) {
    const format = await this.formatRepo.findOneBy({ id: dto.formatId });
    if (!format) throw new NotFoundException("Format introuvable");

    const cardIds = Array.from(new Set(dto.cards.map((card) => card.cardId)));
    const cardEntities = cardIds.length
      ? await this.cardRepo.findBy({ id: In(cardIds) })
      : [];
    const cardById = new Map(cardEntities.map((card) => [card.id, card]));
    const missingCardId = cardIds.find((cardId) => !cardById.has(cardId));
    if (missingCardId) {
      throw new NotFoundException(`Carte ${missingCardId} introuvable`);
    }

    const deck = this.decksRepository.create({
      name: dto.deckName,
      isPublic: dto.isPublic,
      user,
      format,
      coverCard:
        dto.cards.length > 0 ? cardById.get(dto.cards[0].cardId) : undefined,
    });

    await this.decksRepository.save(deck);
    const cards = dto.cards.map((card) =>
      this.deckCardRepo.create({
        card: cardById.get(card.cardId)!,
        qty: card.qty,
        role: card.role,
        deck,
      }),
    );
    if (cards.length > 0) {
      await this.deckCardRepo.save(cards);
    }
    return this.decksRepository.findOne({
      where: { id: deck.id },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails"],
    });
  }

  private async hydrateDeckCards(decks: Deck[]): Promise<void> {
    if (decks.length === 0) return;

    const deckIds = decks.map((deck) => deck.id);
    const deckCards = await this.deckCardRepo.find({
      where: { deck: { id: In(deckIds) } },
      relations: ["deck", "card", "card.pokemonDetails"],
    });
    const cardsByDeckId = new Map<number, DeckCard[]>();
    for (const deckCard of deckCards) {
      const cards = cardsByDeckId.get(deckCard.deck.id) ?? [];
      cards.push(deckCard);
      cardsByDeckId.set(deckCard.deck.id, cards);
    }
    for (const deck of decks) {
      deck.cards = cardsByDeckId.get(deck.id) ?? [];
    }
  }

  /**
   * Retrieves all public decks matching parameters.
   *
   * @param params Query and pagination parameters.
   * @returns Paginated result of public decks.
   */
  async findAll(params: FindAllDecksParams = {}) {
    const {
      formatId = 0,
      page = 1,
      limit = 20,
      sortBy = DeckSortBy.CREATED_AT,
      sortOrder = "DESC",
      search,
    } = params;
    const qb = this.decksRepository
      .createQueryBuilder("deck")
      .leftJoinAndSelect("deck.user", "user")
      .leftJoinAndSelect("deck.format", "format")
      .leftJoinAndSelect("deck.coverCard", "coverCard")
      .leftJoinAndSelect("coverCard.pokemonDetails", "coverCardDetails")
      .andWhere("deck.isPublic = true");
    if (formatId !== 0) {
      qb.andWhere("format.id = :formatId", { formatId });
    }
    if (search) {
      qb.andWhere("LOWER(deck.name) LIKE LOWER(:search)", {
        search: `%${search}%`,
      });
    }
    const orderColumn = resolveDeckSortColumn(sortBy);
    const result = await PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder,
    );
    await this.hydrateDeckCards(result.data);
    return result;
  }

  /**
   * Retrieves all decks owned by a user.
   *
   * @param user User entity.
   * @param params Query and pagination parameters.
   * @returns Paginated result of user decks.
   */
  async findAllFromUser(user: User, params: FindAllDecksParams = {}) {
    const {
      formatId = 0,
      page = 1,
      limit = 20,
      sortBy = DeckSortBy.CREATED_AT,
      sortOrder = "DESC",
      search,
    } = params;
    const qb = this.decksRepository
      .createQueryBuilder("deck")
      .leftJoinAndSelect("deck.user", "user")
      .leftJoinAndSelect("deck.format", "format")
      .leftJoinAndSelect("deck.coverCard", "coverCard")
      .leftJoinAndSelect("coverCard.pokemonDetails", "coverCardDetails")
      .andWhere("user.id = :userId", { userId: user.id });
    if (formatId !== 0) {
      qb.andWhere("format.id = :formatId", { formatId });
    }
    if (search) {
      qb.andWhere("LOWER(deck.name) LIKE LOWER(:search)", {
        search: `%${search}%`,
      });
    }
    const orderColumn = resolveDeckSortColumn(sortBy);
    const result = await PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder,
    );
    await this.hydrateDeckCards(result.data);
    return result;
  }

  /**
   * Retrieves public decks belonging to a user ID.
   *
   * @param userId Target user ID.
   * @param params Pagination options.
   * @returns Paginated public decks.
   */
  async findPublicDecksByUser(
    userId: number,
    params: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 20 } = params;
    const [items, total] = await this.decksRepository.findAndCount({
      where: { user: { id: userId }, isPublic: true },
      relations: ["format", "coverCard"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    await this.hydrateDeckCards(items);
    return { items, total, page, limit };
  }

  private canViewDeck(deck: Deck, viewer?: User): boolean {
    if (deck.isPublic) return true;
    if (!viewer) return false;
    return deck.user?.id === viewer.id || viewer.role === UserRole.ADMIN;
  }

  // 404 et pas 403 : un 403 confirmerait l'existence du deck
  private assertCanViewDeck(deck: Deck, viewer?: User): void {
    if (!this.canViewDeck(deck, viewer)) {
      throw new NotFoundException("Deck introuvable");
    }
  }

  /**
   * Retrieves a deck by ID with all populated card relations.
   *
   * @param id Deck ID.
   * @param viewer Authenticated user, or undefined for anonymous callers.
   * @returns Deck entity.
   */
  async findOneWithCards(id: number, viewer?: User): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: [
        "user",
        "format",
        "cards",
        "cards.card",
        "cards.card.pokemonDetails",
        "coverCard",
        "coverCard.pokemonDetails",
      ],
    });
    if (!deck) throw new NotFoundException("Deck not found");
    this.assertCanViewDeck(deck, viewer);
    return deck;
  }

  /**
   * Performs strategic analysis on deck composition (type ratios, energy curve, warnings).
   *
   * @param id Deck ID.
   * @param viewer Authenticated user, or undefined for anonymous callers.
   * @returns Analysis result metrics and suggestions DTO.
   */
  async analyzeDeck(id: number, viewer?: User): Promise<AnalyzeDeckResultDto> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ["user", "cards", "cards.card", "cards.card.pokemonDetails"],
    });

    if (!deck) throw new NotFoundException("Deck not found");
    this.assertCanViewDeck(deck, viewer);

    const cards = deck.cards || [];
    // Analysis compares card names (energy matching): labels originate from localized translations and must be resolved first
    await this.localization.resolveLabels(cards);

    const totalCards = cards.reduce((sum, card) => sum + (card.qty || 0), 0);

    const typeMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const attackCostMap = new Map<number, number>();
    let totalAttackCost = 0;
    let totalAttackCount = 0;

    cards.forEach((deckCard) => {
      const { card, qty } = deckCard;
      const quantity = qty || 0;
      if (!card) return;

      card.pokemonDetails?.types?.forEach((type) =>
        typeMap.set(type, (typeMap.get(type) || 0) + quantity),
      );

      const categoryLabel = card.pokemonDetails?.category || "Unknown";
      const normalizedCategory = categoryLabel.toLowerCase().replace("é", "e");

      let mappedCategory = categoryLabel;
      if (normalizedCategory === "pokemon")
        mappedCategory = PokemonCardsType.Pokemon;
      if (normalizedCategory === "energy" || normalizedCategory === "energie")
        mappedCategory = PokemonCardsType.Energy;
      if (normalizedCategory === "trainer" || normalizedCategory === "dresseur")
        mappedCategory = PokemonCardsType.Trainer;

      categoryMap.set(
        mappedCategory,
        (categoryMap.get(mappedCategory) || 0) + quantity,
      );

      card.pokemonDetails?.attacks?.forEach((attack) => {
        const cost = attack.cost?.length || 0;
        attackCostMap.set(cost, (attackCostMap.get(cost) || 0) + quantity);
        totalAttackCost += cost * quantity;
        totalAttackCount += quantity;
      });
    });

    const typeDistribution = this.mapToDistribution(typeMap, totalCards);
    const categoryDistribution = this.mapToDistribution(
      categoryMap,
      totalCards,
    );
    const attackCostDistribution = this.mapCostDistribution(
      attackCostMap,
      totalAttackCount,
    );

    const pokemonCount = categoryMap.get(PokemonCardsType.Pokemon) || 0;
    const energyCount = categoryMap.get(PokemonCardsType.Energy) || 0;
    const trainerCount = categoryMap.get(PokemonCardsType.Trainer) || 0;

    const averageEnergyCost = totalAttackCount
      ? parseFloat((totalAttackCost / totalAttackCount).toFixed(2))
      : 0;

    const energyToPokemonRatio = pokemonCount
      ? parseFloat((energyCount / pokemonCount).toFixed(2))
      : 0;

    const duplicates = cards
      .filter(
        (deckCard) =>
          deckCard.qty > 4 &&
          deckCard.card?.pokemonDetails?.category !== PokemonCardsType.Energy &&
          !deckCard.card?.name?.toLowerCase().includes("energy") &&
          !deckCard.card?.name?.toLowerCase().includes("energie") &&
          !deckCard.card?.name?.toLowerCase().includes("énergie"),
      )
      .map((deckCard) => ({
        cardId: deckCard.card.id,
        cardName: deckCard.card.name || "Carte inconnue",
        qty: deckCard.qty,
      }));

    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (totalCards < 60) {
      warnings.push(`Deck incomplet: ${totalCards}/60 cartes`);
    } else if (totalCards > 60) {
      warnings.push(`Deck trop grand: ${totalCards}/60 cartes`);
    }

    if (duplicates.length) {
      warnings.push(
        "Certaines cartes dépassent la limite autorisée (maximum 4 exemplaires hors énergies).",
      );
    }

    this.evaluateEnergyBalance(
      energyCount,
      pokemonCount,
      totalCards,
      averageEnergyCost,
      warnings,
      suggestions,
    );

    if (trainerCount < 10) {
      suggestions.push(
        "Ajoutez des cartes Dresseur pour stabiliser le deck (recommandé: 10+).",
      );
    }

    if (typeDistribution.length > 2) {
      suggestions.push(
        `Deck multi-type détecté (${typeDistribution
          .slice(0, 3)
          .map((d) => d.label)
          .join(
            ", ",
          )}), concentrez-vous sur 1 à 2 types principaux pour plus de constance.`,
      );
    } else if (typeDistribution.length === 1 && energyCount > 0) {
      suggestions.push(
        `Renforcez le type ${typeDistribution[0].label} avec des cartes de support compatibles.`,
      );
    }

    const missingCards = this.buildMissingCardsSuggestions({
      energyCount,
      pokemonCount,
      trainerCount,
      totalCards,
      typeDistribution,
      averageEnergyCost,
    });

    return {
      deckId: deck.id,
      totalCards,
      pokemonCount,
      energyCount,
      trainerCount,
      energyToPokemonRatio,
      averageEnergyCost,
      typeDistribution,
      categoryDistribution,
      attackCostDistribution,
      duplicates,
      warnings,
      suggestions,
      missingCards,
    };
  }

  /**
   * Updates an existing deck's name, format, or card list.
   *
   * @param deckId Deck ID.
   * @param user Deck owner.
   * @param dto Update parameters.
   * @returns Updated Deck.
   */
  async updateDeck(deckId: number, user: User, dto: UpdateDeckDto) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId, user: { id: user.id } },
      relations: ["cards"],
    });

    if (!deck) throw new NotFoundException("Deck introuvable");

    if (dto.deckName) {
      deck.name = dto.deckName;
    }
    // pas de `if (dto.isPublic)` : false doit pouvoir repasser le deck en privé
    if (dto.isPublic !== undefined) {
      deck.isPublic = dto.isPublic;
    }
    if (dto.formatId) {
      const format = await this.formatRepo.findOneBy({ id: dto.formatId });
      if (!format) throw new NotFoundException("Format introuvable");
      if (format) {
        deck.format = format;
      }
    }
    await this.decksRepository.save(deck);

    // filtré par deckId : un id de DeckCard du payload ne doit pas permettre
    // de toucher aux cartes d'un autre deck
    if (dto.cardsToRemove?.length) {
      const removable = await this.deckCardRepo.find({
        where: {
          id: In(dto.cardsToRemove.map((c) => c.id)),
          deck: { id: deck.id },
        },
        select: { id: true },
      });
      if (removable.length > 0) {
        await this.deckCardRepo.delete(removable.map((c) => c.id));
      }
    }

    if (dto.cardsToAdd?.length) {
      const cardIds = Array.from(
        new Set(dto.cardsToAdd.map((card) => card.cardId)),
      );
      const cardEntities = await this.cardRepo.findBy({ id: In(cardIds) });
      const cardById = new Map(cardEntities.map((card) => [card.id, card]));
      const missingCardId = cardIds.find((cardId) => !cardById.has(cardId));
      if (missingCardId) {
        throw new NotFoundException(`Carte ${missingCardId} introuvable`);
      }
      const cards = dto.cardsToAdd.map((card) =>
        this.deckCardRepo.create({
          card: cardById.get(card.cardId)!,
          qty: card.qty,
          role: card.role as DeckCardRole,
          deck,
        }),
      );
      await this.deckCardRepo.save(cards);
    }

    if (dto.cardsToUpdate?.length) {
      const updateIds = dto.cardsToUpdate.map((card) => card.id);
      // filtré par deckId, même raison que pour cardsToRemove
      const cardEntities = await this.deckCardRepo.find({
        where: { id: In(updateIds), deck: { id: deck.id } },
      });
      const cardById = new Map(cardEntities.map((card) => [card.id, card]));
      for (const card of dto.cardsToUpdate) {
        const cardEntity = cardById.get(card.id);
        if (!cardEntity) {
          throw new NotFoundException(`Carte ${card.id} introuvable`);
        }
        if (card.qty) {
          cardEntity.qty = card.qty;
        }
        if (card.role) {
          cardEntity.role = card.role;
        }
      }
      await this.deckCardRepo.save(cardEntities);
    }

    return this.decksRepository.findOne({
      where: { id: deck.id },
      relations: ["cards", "cards.card"],
    });
  }

  /**
   * Deletes a deck owned by the given user.
   *
   * @param id Deck ID.
   * @param user Authenticated user, must own the deck (or be an admin).
   */
  async remove(id: number, user: User) {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ["user"],
    });
    if (!deck) throw new NotFoundException(`Deck #${id} not found`);
    if (deck.user?.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Vous ne pouvez supprimer que vos propres decks",
      );
    }
    await this.decksRepository.remove(deck);
    return { message: `Deck ${deck.name} supprimé avec succès` };
  }

  /**
   * Creates a duplicate copy of a deck for the user.
   *
   * @param id Target deck ID to clone.
   * @param user User cloning the deck.
   * @returns Newly cloned Deck.
   */
  async cloneDeck(id: number, user: User): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ["user", "format", "cards", "cards.card"],
    });
    if (!deck) throw new NotFoundException("Deck not found");
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Not allowed to clone this deck");
    }

    const cloned = this.decksRepository.create({
      name: `${deck.name} (copy)`,
      isPublic: deck.isPublic,
      user,
      format: deck.format,
    });
    const saved = await this.decksRepository.save(cloned);
    if (deck.cards?.length) {
      const clonedCards = deck.cards.map((dc) =>
        this.deckCardRepo.create({
          deck: { id: saved.id },
          card: { id: dc.card.id },
          qty: dc.qty,
          role: dc.role,
        }),
      );
      await this.deckCardRepo.save(clonedCards);
    }
    return this.findOneWithCards(saved.id, user);
  }

  /**
   * Increments view count for a deck.
   *
   * @param id Deck ID.
   */
  async incrementViews(id: number) {
    await this.decksRepository.increment({ id }, "views", 1);
    return { message: "View incremented" };
  }

  /**
   * Saves a public deck to a user's saved deck library.
   *
   * @param deckId Target deck ID.
   * @param user User saving the deck.
   */
  async saveDeckToLibrary(deckId: number, user: User) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId },
      relations: ["user"],
    });
    if (!deck) throw new NotFoundException("Deck introuvable");
    if (deck.user?.id === user.id) {
      throw new BadRequestException(
        "Vous ne pouvez pas ajouter votre propre deck à votre bibliothèque",
      );
    }
    if (!deck.isPublic) {
      throw new ForbiddenException("Ce deck n'est pas public");
    }

    const existing = await this.savedDeckRepo.findOne({
      where: { user: { id: user.id }, deck: { id: deckId } },
    });
    if (existing) {
      return { saved: true, alreadySaved: true };
    }

    const savedDeck = this.savedDeckRepo.create({ user, deck });
    await this.savedDeckRepo.save(savedDeck);
    return { saved: true, alreadySaved: false };
  }

  /**
   * Removes a saved deck from a user's library.
   *
   * @param deckId Saved deck ID.
   * @param user User entity.
   */
  async removeDeckFromLibrary(deckId: number, user: User) {
    const result = await this.savedDeckRepo.delete({
      user: { id: user.id },
      deck: { id: deckId },
    });
    if (!result.affected) {
      throw new ForbiddenException({
        code: "DECK_NOT_IN_LIBRARY",
        message: "Ce deck n'est pas dans votre bibliothèque",
      });
    }
    return { saved: false };
  }

  /**
   * Retrieves all decks saved in a user's library.
   *
   * @param user User entity.
   * @param params Query and pagination parameters.
   * @returns Paginated list of saved decks.
   */
  async findSavedDecks(user: User, params: FindAllDecksParams = {}) {
    const {
      formatId = 0,
      page = 1,
      limit = 20,
      sortBy = DeckSortBy.CREATED_AT,
      sortOrder = "DESC",
      search,
    } = params;

    const qb = this.savedDeckRepo
      .createQueryBuilder("savedDeck")
      .innerJoin("savedDeck.user", "savedUser")
      .leftJoinAndSelect("savedDeck.deck", "deck")
      .leftJoinAndSelect("deck.user", "user")
      .leftJoinAndSelect("deck.format", "format")
      .leftJoinAndSelect("deck.coverCard", "coverCard")
      .leftJoinAndSelect("coverCard.pokemonDetails", "coverCardDetails")
      .leftJoinAndSelect("deck.cards", "cards")
      .leftJoinAndSelect("cards.card", "card")
      .leftJoinAndSelect("card.pokemonDetails", "cardDetails")
      .where("savedUser.id = :userId", { userId: user.id });

    if (formatId !== 0) {
      qb.andWhere("format.id = :formatId", { formatId });
    }
    if (search) {
      qb.andWhere("LOWER(deck.name) LIKE LOWER(:search)", {
        search: `%${search}%`,
      });
    }

    const orderColumn = resolveDeckSortColumn(sortBy, SAVED_DECK_SORT_COLUMNS);

    const paginated = await PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder,
    );

    return {
      data: paginated.data.map((entry) => entry.deck),
      meta: paginated.meta,
    };
  }

  /**
   * Returns array of deck IDs saved by the specified user.
   *
   * @param user Target user entity.
   * @returns Array of deck IDs.
   */
  async findSavedDeckIds(user: User): Promise<number[]> {
    const rows = await this.savedDeckRepo
      .createQueryBuilder("savedDeck")
      .innerJoin("savedDeck.user", "savedUser")
      .innerJoin("savedDeck.deck", "deck")
      .select("deck.id", "deckId")
      .where("savedUser.id = :userId", { userId: user.id })
      .getRawMany<{ deckId: number }>();
    return rows.map((r) => Number(r.deckId));
  }

  private generateShareCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generates a unique share code for a deck.
   *
   * @param id Deck ID.
   * @param user Deck owner user.
   * @param dto Share options including expiration date.
   * @returns Share code object.
   */
  async shareDeck(
    id: number,
    user: User,
    dto?: ShareDeckDto,
  ): Promise<{ code: string }> {
    const deck = await this.decksRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!deck) throw new NotFoundException("Deck not found");

    let code = this.generateShareCode();
    let exists = true;
    while (exists) {
      const existing = await this.deckShareRepo.findOneBy({ code });
      if (!existing) {
        exists = false;
      } else {
        code = this.generateShareCode();
      }
    }

    const deckShare = this.deckShareRepo.create({
      deck,
      code,
      expiresAt: dto?.expiresAt ? new Date(dto.expiresAt) : null,
    });

    await this.deckShareRepo.save(deckShare);
    return { code };
  }

  /**
   * Imports a shared deck using a share code.
   *
   * @param code Share code.
   * @param user Importing user entity.
   * @returns Cloned Deck entity.
   */
  async importDeck(code: string, user: User): Promise<Deck> {
    const deckShare = await this.deckShareRepo.findOne({
      where: { code },
      relations: ["deck", "deck.format", "deck.cards", "deck.cards.card"],
    });

    if (!deckShare) throw new NotFoundException("Code de partage invalide");

    const now = new Date();
    if (deckShare.expiresAt && deckShare.expiresAt < now) {
      throw new NotFoundException({
        code: "SHARE_CODE_EXPIRED",
        message: "Ce code de partage a expiré",
      });
    }

    const sourceDeck = deckShare.deck;

    const cloned = this.decksRepository.create({
      name: sourceDeck.name,
      isPublic: false,
      user,
      format: sourceDeck.format,
    });
    const saved = await this.decksRepository.save(cloned);

    if (sourceDeck.cards?.length) {
      const clonedCards = sourceDeck.cards.map((dc) =>
        this.deckCardRepo.create({
          deck: { id: saved.id },
          card: { id: dc.card.id },
          qty: dc.qty,
          role: dc.role,
        }),
      );
      await this.deckCardRepo.save(clonedCards);
    }

    return this.findOneWithCards(saved.id, user);
  }

  /**
   * Retrieves deck entity details associated with a share code without importing.
   *
   * @param code Share code.
   * @returns Shared Deck entity.
   */
  async getDeckForImport(code: string): Promise<Deck> {
    const deckShare = await this.deckShareRepo.findOne({
      where: { code },
      relations: [
        "deck",
        "deck.format",
        "deck.cards",
        "deck.cards.card",
        "deck.user",
      ],
    });

    if (!deckShare) throw new NotFoundException("Code de partage invalide");

    const now = new Date();
    if (deckShare.expiresAt && deckShare.expiresAt < now) {
      throw new NotFoundException({
        code: "SHARE_CODE_EXPIRED",
        message: "Ce code de partage a expiré",
      });
    }

    return deckShare.deck;
  }

  private mapToDistribution(
    map: Map<string, number>,
    total: number,
  ): { label: string; count: number; percentage: number }[] {
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private mapCostDistribution(
    map: Map<number, number>,
    total: number,
  ): { cost: number; count: number; percentage: number }[] {
    return Array.from(map.entries())
      .map(([cost, count]) => ({
        cost,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => a.cost - b.cost);
  }

  private evaluateEnergyBalance(
    energyCount: number,
    pokemonCount: number,
    totalCards: number,
    averageEnergyCost: number,
    warnings: string[],
    suggestions: string[],
  ) {
    if (!totalCards) return;

    const energyRatio = energyCount / totalCards;

    if (energyRatio < 0.25) {
      warnings.push(
        "Pas assez d'énergies pour alimenter les attaques (vise 25-35% du deck).",
      );
      suggestions.push(
        "Ajoutez plusieurs cartes énergie pour sécuriser vos sorties.",
      );
    } else if (energyRatio > 0.45) {
      warnings.push("Beaucoup d'energies detectees, risque de mains mortes.");
      suggestions.push(
        "Réduisez légèrement les énergies au profit de Dresseurs ou Pokémon clés.",
      );
    }

    if (pokemonCount > 0 && energyCount === 0) {
      warnings.push(
        "Aucune énergie détectée alors que des Pokémon sont présents.",
      );
    }

    if (averageEnergyCost > 3 && energyRatio < 0.35) {
      suggestions.push(
        "Les attaques coûtent cher ; ajoutez de l'accélération d'énergie ou augmentez légèrement le nombre d'énergies.",
      );
    }
  }

  private buildMissingCardsSuggestions({
    energyCount,
    pokemonCount,
    trainerCount,
    totalCards,
    typeDistribution,
    averageEnergyCost,
  }: {
    energyCount: number;
    pokemonCount: number;
    trainerCount: number;
    totalCards: number;
    typeDistribution: { label: string; count: number; percentage: number }[];
    averageEnergyCost: number;
  }): MissingCardSuggestionDto[] {
    const suggestions: MissingCardSuggestionDto[] = [];

    const targetEnergy = Math.max(
      10,
      Math.round(Math.max(totalCards * 0.25, pokemonCount * 0.4)),
    );
    if (energyCount < targetEnergy) {
      suggestions.push({
        label: "Énergies",
        reason:
          "Ajoutez des énergies pour suivre le rythme de vos Pokémon principaux.",
        recommendedQty: targetEnergy - energyCount,
      });
    }

    if (trainerCount < 12) {
      suggestions.push({
        label: "Dresseurs de pioche",
        reason:
          "Renforcez la consistance avec davantage de supporters / dresseurs utilitaires.",
        recommendedQty: 12 - trainerCount,
      });
    }

    if (typeDistribution.length) {
      const mainType = typeDistribution[0];
      suggestions.push({
        label: `Support ${mainType.label}`,
        reason: `Ajoutez 1-2 cartes qui profitent spécifiquement au type ${mainType.label}.`,
        recommendedQty: 2,
      });
    }

    if (averageEnergyCost >= 3 && energyCount < totalCards * 0.35) {
      suggestions.push({
        label: "Accélération d'énergie",
        reason:
          "Vos coûts moyens sont élevés : prévoyez des cartes qui mettent des énergies en jeu ou réduisent ces coûts.",
        recommendedQty: 2,
      });
    }

    const uniqueSuggestions = new Map<string, MissingCardSuggestionDto>();
    suggestions.forEach((entry) => {
      if (!uniqueSuggestions.has(entry.label)) {
        uniqueSuggestions.set(entry.label, entry);
      }
    });

    return Array.from(uniqueSuggestions.values());
  }

  async exportDeck(id: number, viewer?: User) {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: [
        "user",
        "format",
        "cards",
        "cards.card",
        "cards.card.pokemonDetails",
      ],
    });
    if (!deck) throw new NotFoundException("Deck introuvable");
    this.assertCanViewDeck(deck, viewer);

    return {
      name: deck.name,
      format: deck.format?.type || "Standard",
      cards: (deck.cards || []).map((dc) => ({
        tcgDexId: dc.card?.tcgDexId || dc.card?.id,
        name: dc.card?.name || "Carte inconnue",
        qty: dc.qty,
        role: dc.role,
      })),
    };
  }

  async importDeckFromJson(user: User, dto: ImportDeckJsonDto) {
    const format = await this.formatRepo.findOneBy({ type: dto.format });
    if (!format) {
      throw new BadRequestException(
        `Format "${dto.format}" introuvable. Formats disponibles : vérifiez la liste des formats.`,
      );
    }

    const resolvedCards: { card: Card; qty: number; role: DeckCardRole }[] = [];
    const notFound: string[] = [];

    for (const entry of dto.cards) {
      const card = await this.cardRepo.findOneBy({ tcgDexId: entry.tcgDexId });
      if (!card) {
        notFound.push(entry.tcgDexId);
        continue;
      }
      resolvedCards.push({ card, qty: entry.qty, role: entry.role });
    }

    if (resolvedCards.length === 0) {
      throw new BadRequestException(
        `Aucune carte trouvée dans la base. Identifiants introuvables : ${notFound.join(", ")}`,
      );
    }

    const deck = this.decksRepository.create({
      name: dto.name,
      isPublic: dto.isPublic ?? false,
      user,
      format,
      coverCard: resolvedCards[0]?.card || undefined,
    });
    await this.decksRepository.save(deck);

    const deckCards = resolvedCards.map((rc) =>
      this.deckCardRepo.create({
        card: rc.card,
        qty: rc.qty,
        role: rc.role,
        deck,
      }),
    );
    await this.deckCardRepo.save(deckCards);

    const result = await this.findOneWithCards(deck.id, user);
    return {
      deck: result,
      ...(notFound.length > 0 && {
        warnings: [`Cartes introuvables (ignorées) : ${notFound.join(", ")}`],
      }),
    };
  }
}
