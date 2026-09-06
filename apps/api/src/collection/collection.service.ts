import { CardService } from "src/card/card.service";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "src/translation/supported-locales";
import {
  applyCardSearch,
  applyRarityFilter,
  sealedProductNameMatchesSql,
  localizedSealedNameSql,
} from "src/card/card-search";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import {
  CardState,
  CardStateCode,
} from "src/card-state/entities/card-state.entity";
import { ListingStatus } from "src/common/enums/listing-status";
import { ProductKind } from "src/common/enums/product-kind";
import { UserRole } from "src/common/enums/user";
import { Listing } from "src/marketplace/entities/listing.entity";
import { MarketplaceService } from "src/marketplace/marketplace.service";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { ListDuplicateDto } from "./dto/list-duplicate.dto";

import { Brackets, Repository } from "typeorm";
import { normalizeSortOrder } from "../helpers/pagination";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { User } from "../user/entities/user.entity";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { Collection } from "./entities/collection.entity";

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private collectionItemRepository: Repository<CollectionItem>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(CardState)
    private cardStateRepository: Repository<CardState>,
    @InjectRepository(PokemonSet)
    private pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @Inject(forwardRef(() => MarketplaceService))
    private readonly marketplaceService: MarketplaceService,
    private readonly cardService: CardService,
    private readonly localization: CatalogLocalizationService,
  ) {}


  private async getOwnedCollection(
    id: string,
    userId: number,
  ): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id },
      relations: ["user", "items", "items.pokemonCard"],
    });

    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (collection.user.id !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez acceder qu'a vos propres collections",
      );
    }

    return collection;
  }

  private canViewCollection(collection: Collection, viewer?: User): boolean {
    if (collection.isPublic) return true;
    if (!viewer) return false;
    return collection.user?.id === viewer.id || viewer.role === UserRole.ADMIN;
  }

  // NOTE: A 404 avoids disclosing the existence of a private collection.
  private assertCanViewCollection(collection: Collection, viewer?: User): void {
    if (!this.canViewCollection(collection, viewer)) {
      throw new NotFoundException(
        `Collection with id ${collection.id} not found`,
      );
    }
  }

  private async getViewableCollection(
    collectionId: string,
    viewer: User | undefined,
    relations: string[] = [],
  ): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
      relations: ["user", ...relations],
    });

    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }

    this.assertCanViewCollection(collection, viewer);
    return collection;
  }

  /**
   * Retrieves all public collections.
   *
   * @returns Array of public Collection entities.
   */
  async findAll(): Promise<Collection[]> {
    return this.collectionRepository.find({
      select: [
        "id",
        "name",
        "description",
        "created_at",
        "updated_at",
        "user",
        "isPublic",
      ],
      where: { isPublic: true },
      relations: ["user"],
    });
  }

  /**
   * Finds all collections owned by a specific user, restricted to the public
   * ones unless the viewer is the owner or an admin.
   *
   * @param userId Target user ID.
   * @param viewer Authenticated user, or undefined for anonymous callers.
   * @returns Visible collections.
   */
  async findByUserId(userId: string, viewer?: User): Promise<Collection[]> {
    const ownerId = Number(userId);
    const seesEverything =
      viewer?.id === ownerId || viewer?.role === UserRole.ADMIN;

    return await this.collectionRepository.find({
      where: seesEverything
        ? { user: { id: ownerId } }
        : { user: { id: ownerId }, isPublic: true },
      relations: ["user", "items", "masterSet"],
    });
  }

  /**
   * Finds a collection by ID, provided the viewer is allowed to read it.
   *
   * @param id Collection UUID.
   * @param viewer Authenticated user, or undefined for anonymous callers.
   * @returns Collection entity.
   */
  async findOneById(id: string, viewer?: User): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ["items", "user", "masterSet"],
    });
    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }
    this.assertCanViewCollection(collection, viewer);
    return collection;
  }

  /**
   * Builds the label pair of a Master Set collection.
   *
   * Set names live in the translations table: the set must have gone through
   * `CatalogLocalizationService` first, otherwise `name` is undefined and the
   * labels end up carrying "undefined". The set identifier is kept as a last
   * resort so a missing translation never surfaces to the user.
   *
   * @param set - Localized Pokémon set.
   * @returns Collection name and description.
   */
  private buildMasterSetLabels(set: PokemonSet): {
    name: string;
    description: string;
  } {
    const setName = set.name?.trim() || set.id;
    return {
      name: `Master Set — ${setName}`,
      description: `Master Set pour l'extension ${setName}`,
    };
  }

  /**
   * Creates a new user collection or Master Set collection.
   *
   * @param createCollectionDto Collection creation parameters.
   * @returns Created Collection entity.
   */
  async create(
    createCollectionDto: CreateCollectionDto,
    userId: number,
  ): Promise<Collection> {
    let masterSet: PokemonSet | undefined;

    if (createCollectionDto.masterSetId) {
      const set = await this.pokemonSetRepository.findOne({
        where: { id: createCollectionDto.masterSetId },
      });
      if (!set) {
        throw new NotFoundException(
          `PokemonSet with id ${createCollectionDto.masterSetId} not found`,
        );
      }

      // The set name is stored in the collection labels: resolve it before use.
      await this.localization.resolveLabels(set);

      // Prevent duplicate collection creation for the same user and master set
      const existing = await this.collectionRepository.findOne({
        where: {
          user: { id: userId },
          masterSet: { id: set.id },
        },
      });
      if (existing) {
        throw new ForbiddenException(
          `Un Master Set existe déjà pour l'extension ${set.name?.trim() || set.id}.`,
        );
      }

      masterSet = set;
    }

    if (!masterSet && !createCollectionDto.name) {
      throw new ForbiddenException("Le nom de la collection est requis.");
    }

    const masterSetLabels = masterSet
      ? this.buildMasterSetLabels(masterSet)
      : undefined;

    const collection = this.collectionRepository.create({
      name: masterSetLabels ? masterSetLabels.name : createCollectionDto.name,
      description: masterSetLabels
        ? masterSetLabels.description
        : createCollectionDto.description,
      isPublic: createCollectionDto.isPublic || false,
    });
    collection.user = { id: userId } as User;
    if (masterSet) {
      collection.masterSet = masterSet;
    }
    return await this.collectionRepository.save(collection);
  }

  /**
   * Adds a Pokémon card to an owned collection or increments item quantity.
   *
   * @param collectionId Target collection ID.
   * @param pokemonCardId Card ID to add.
   * @param userId Requesting user ID.
   * @returns Created or updated CollectionItem.
   */
  async addCardToCollection(
    collectionId: string,
    pokemonCardId: string,
    userId: number,
  ): Promise<CollectionItem> {
    const collection = await this.getOwnedCollection(collectionId, userId);

    // An empty criterion is dropped by TypeORM and would match the first card
    // of the table instead of failing.
    if (!pokemonCardId) {
      throw new BadRequestException("Identifiant de carte manquant");
    }

    const card = await this.cardRepository.findOne({
      where: { id: pokemonCardId },
    });

    if (!card) {
      throw new NotFoundException("Carte non trouvee");
    }

    const existingItem = collection.items?.find(
      (item) => item.pokemonCard?.id === card.id,
    );

    if (existingItem) {
      existingItem.quantity += 1;
      return this.collectionItemRepository.save(existingItem);
    }

    const defaultCardState = await this.cardStateRepository.findOne({
      where: { code: CardStateCode.NM },
    });

    if (!defaultCardState) {
      throw new NotFoundException(
        "CardState NM non trouve. Lance d'abord le seed card states.",
      );
    }

    const newItem = this.collectionItemRepository.create({
      collection,
      productKind: ProductKind.CARD,
      pokemonCard: card,
      cardState: defaultCardState,
      quantity: 1,
    });

    return this.collectionItemRepository.save(newItem);
  }

  /**
   * Decrements or removes a card from an owned collection.
   *
   * @param collectionId Target collection ID.
   * @param pokemonCardId Card ID to remove.
   * @param userId Requesting user ID.
   * @returns Updated item or null if completely removed.
   */
  async removeCardFromCollection(
    collectionId: string,
    pokemonCardId: string,
    userId: number,
  ): Promise<CollectionItem | null> {
    const collection = await this.getOwnedCollection(collectionId, userId);

    const existingItem = collection.items?.find(
      (item) => item.pokemonCard?.id === pokemonCardId,
    );

    if (!existingItem) {
      throw new NotFoundException("Carte non trouvee dans la collection");
    }

    if (existingItem.quantity > 1) {
      existingItem.quantity -= 1;
      return this.collectionItemRepository.save(existingItem);
    }

    await this.collectionItemRepository.delete(existingItem.id);
    return null;
  }

  /**
   * Removes a specific collection item by ID.
   *
   * @param collectionId Parent collection ID.
   * @param itemId Item ID.
   * @param userId Requesting user ID.
   */
  async removeCollectionItem(
    collectionId: string,
    itemId: number,
    userId: number,
  ): Promise<void> {
    await this.getOwnedCollection(collectionId, userId);

    const item = await this.collectionItemRepository.findOne({
      where: {
        id: itemId,
        collection: { id: collectionId },
      },
      relations: ["collection"],
    });

    if (!item) {
      throw new NotFoundException("Item de collection non trouve");
    }

    await this.collectionItemRepository.delete(itemId);
  }

  /**
   * Updates collection metadata.
   *
   * @param id Collection ID.
   * @param updateCollectionDto Update DTO.
   * @param userId Requesting user ID.
   * @returns Updated Collection.
   */
  async update(
    id: string,
    updateCollectionDto: UpdateCollectionDto,
    userId: number,
  ): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ["user"],
    });

    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (collection.user.id !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres collections",
      );
    }

    Object.assign(collection, updateCollectionDto);

    return await this.collectionRepository.save(collection);
  }

  /**
   * Deletes a collection owned by the user.
   *
   * @param id Collection ID.
   * @param userId Requesting user ID.
   */
  async delete(id: string, userId: number): Promise<void> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ["user"],
    });

    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (collection.user.id !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez supprimer que vos propres collections",
      );
    }

    await this.collectionRepository.remove(collection);
  }

  /**
   * Retrieves a paginated list of public collections.
   *
   * @param page 1-based page index.
   * @param limit Items per page.
   * @returns Object with collections array and page metadata.
   */
  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{
    collections: Collection[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [collections, total] = await this.collectionRepository.findAndCount({
      where: { isPublic: true },
      relations: ["user"],
      skip,
      take: limit,
      order: { created_at: "DESC" },
    });

    return {
      collections,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves paginated items within a specific collection with filtering and sorting support.
   *
   * @param collectionId Target collection ID.
   * @param page Page index.
   * @param limit Items per page.
   * @param search Optional search query.
   * @param sortBy Field to sort by.
   * @param sortOrder ASC or DESC.
   * @param setId Optional set filter.
   * @param serieId Optional series filter.
   * @param rarity Optional card rarity filter.
   * @param cardState Optional card state condition filter.
   * @param viewer User requesting the collection.
   * @param ownedOnly Whether Master Sets should exclude cards with no owned copy.
   * @param cardsOnly Whether sealed collection items should be excluded.
   * @returns Paginated items and metadata.
   */
  async findCollectionItemsPaginated(
    collectionId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy: string = "added_at",
    sortOrder: "ASC" | "DESC" = "DESC",
    setId?: string,
    serieId?: string,
    rarity?: string,
    cardState?: string,
    viewer?: User,
    ownedOnly: boolean = false,
    cardsOnly: boolean = false,
  ): Promise<{
    data: CollectionItem[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const collection = await this.getViewableCollection(collectionId, viewer, [
      "masterSet",
    ]);

    const isMasterSet = collection.masterSet != null;
    const skip = (page - 1) * limit;

    if (isMasterSet) {
      const masterSetId = collection.masterSet!.id;
      const queryBuilder = this.cardRepository
        .createQueryBuilder("card")
        .leftJoinAndSelect("card.set", "set")
        .leftJoinAndSelect("set.serie", "serie")
        .leftJoinAndSelect(
          "card.collectionItems",
          "item",
          "item.collection.id = :collectionId",
          { collectionId },
        )
        .leftJoinAndSelect("item.cardState", "cardState")
        .where("set.id = :masterSetId", { masterSetId });

      if (search) {
        applyCardSearch(queryBuilder, search);
      }

      if (setId) {
        queryBuilder.andWhere("set.id = :setId", { setId });
      }
      if (serieId) {
        queryBuilder.andWhere("serie.id = :serieId", { serieId });
      }
      if (rarity) {
        applyRarityFilter(queryBuilder, rarity);
      }
      if (cardState) {
        queryBuilder.andWhere("cardState.code = :cardState", {
          cardState,
        });
      }
      if (ownedOnly) {
        queryBuilder.andWhere("item.id IS NOT NULL");
        queryBuilder.andWhere("item.quantity > 0");
      }

      queryBuilder.orderBy("card.localId", "ASC");

      const totalItems = await queryBuilder.getCount();
      const cards = await queryBuilder.skip(skip).take(limit).getMany();

      const data = cards.map((card) => {
        const item = card.collectionItems?.[0];
        return {
          id: item?.id ?? null,
          quantity: item?.quantity ?? 0,
          productKind: ProductKind.CARD,
          cardState: item?.cardState ?? null,
          added_at: item?.added_at ?? null,
          // `tcgDexId` allows `CatalogLocalizationInterceptor` to attach localized name, image, rarity, and category
          pokemonCard: {
            id: card.id,
            tcgDexId: card.tcgDexId,
            localId: card.localId,
            updated: card.updated,
            set: card.set,
          },
        };
      });

      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: data as any,
        meta: {
          totalItems,
          itemCount: data.length,
          itemsPerPage: limit,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }

    // Build query with filters
    const queryBuilder = this.collectionItemRepository
      .createQueryBuilder("item")
      .leftJoinAndSelect("item.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("item.sealedProduct", "sealedProduct")
      .leftJoinAndSelect("sealedProduct.pokemonSet", "sealedSet")
      .leftJoinAndSelect("sealedSet.serie", "sealedSerie")
      .leftJoinAndSelect("item.cardState", "cardState")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("item.collection.id = :collectionId", { collectionId });

    if (ownedOnly) {
      queryBuilder.andWhere("item.quantity > 0");
    }
    if (cardsOnly) {
      queryBuilder.andWhere("pokemonCard.id IS NOT NULL");
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((where) => {
          applyCardSearch(where, search, { alias: "pokemonCard" });
          where.orWhere(
            sealedProductNameMatchesSql("sealedProduct", "sealedSearch"),
            {
              sealedSearch: `%${search.toLowerCase()}%`,
            },
          );
        }),
      );
    }

    if (setId) {
      queryBuilder.andWhere("(set.id = :setId OR sealedSet.id = :setId)", {
        setId,
      });
    }

    if (serieId) {
      queryBuilder.andWhere(
        "(serie.id = :serieId OR sealedSerie.id = :serieId)",
        { serieId },
      );
    }

    if (rarity) {
      applyRarityFilter(queryBuilder, rarity, { alias: "pokemonCard" });
    }

    if (cardState) {
      queryBuilder.andWhere("cardState.code = :cardState", { cardState });
    }

    const validSortBy = [
      "added_at",
      "quantity",
      "pokemonCard.name",
      "pokemonCard.rarity",
    ];
    const sortField = validSortBy.includes(sortBy) ? sortBy : "added_at";

    if (
      sortField === "pokemonCard.name" ||
      sortField === "pokemonCard.rarity"
    ) {
      // Name and rarity live in translations. The join is filtered on a single
      // locale so it stays one-to-one; sorting uses the default locale since no
      // request language reaches this layer.
      queryBuilder.leftJoin(
        "pokemonCard.translations",
        "sortTranslation",
        "sortTranslation.locale = :sortLocale",
        { sortLocale: DEFAULT_LOCALE },
      );
      queryBuilder.orderBy(
        sortField === "pokemonCard.name"
          ? `COALESCE(sortTranslation.name, ${localizedSealedNameSql("sealedProduct")})`
          : "sortTranslation.rarity",
        normalizeSortOrder(sortOrder),
      );
    } else {
      queryBuilder.orderBy(`item.${sortField}`, normalizeSortOrder(sortOrder));
    }

    const totalItems = await queryBuilder.getCount();
    // `offset`/`limit` rather than `skip`/`take`: the latter wraps the query in
    // a DISTINCT subquery that cannot see the joined sort column. Safe here
    // since every join resolves to at most one row per item.
    const items = await queryBuilder.offset(skip).limit(limit).getMany();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getSetRarities(
    collectionId: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
    viewer?: User,
  ): Promise<string[]> {
    const collection = await this.getViewableCollection(collectionId, viewer, [
      "masterSet",
    ]);
    if (!collection.masterSet) {
      return [];
    }

    // Rarities are localized labels: delegate to CardService which handles locale resolution and fallbacks
    return this.cardService.getSetRarities(collection.masterSet.id, locale);
  }

  /**
   * Bulk adds all missing set cards of a collection to the user's Wishlist (COL-05).
   *
   * @param collectionId Target collection ID.
   * @param userId Requesting user ID.
   * @returns Added card count.
   */
  async wishlistMissingCards(
    collectionId: string,
    userId: number,
  ): Promise<{ addedCount: number }> {
    const collection = await this.getOwnedCollection(collectionId, userId);
    if (!collection.masterSet) {
      throw new BadRequestException(
        "Cette opération nécessite une collection liée à une extension (Master Set)",
      );
    }

    const setCards = await this.cardRepository.find({
      where: { set: { id: collection.masterSet.id } },
    });

    const ownedCardIds = new Set(
      collection.items
        ?.filter(
          (i) =>
            i.productKind === ProductKind.CARD &&
            i.pokemonCard &&
            i.quantity > 0,
        )
        .map((i) => i.pokemonCard!.id) || [],
    );

    const missingCards = setCards.filter((c) => !ownedCardIds.has(c.id));
    if (missingCards.length === 0) {
      return { addedCount: 0 };
    }

    let wishlist = await this.collectionRepository.findOne({
      where: { user: { id: userId }, name: "Wishlist" },
      relations: ["items", "items.pokemonCard"],
    });

    if (!wishlist) {
      wishlist = await this.collectionRepository.save(
        this.collectionRepository.create({
          name: "Wishlist",
          description: "Default wishlist",
          user: { id: userId } as User,
          isPublic: false,
        }),
      );
      wishlist.items = [];
    }

    const wishlistCardIds = new Set(
      wishlist.items
        ?.filter((i) => i.pokemonCard)
        .map((i) => i.pokemonCard!.id) || [],
    );

    const defaultCardState =
      (await this.cardStateRepository.findOne({
        where: { code: CardStateCode.NM },
      })) || (await this.cardStateRepository.find())[0];

    let addedCount = 0;
    for (const card of missingCards) {
      if (wishlistCardIds.has(card.id)) continue;

      const item = this.collectionItemRepository.create({
        collection: wishlist,
        productKind: ProductKind.CARD,
        pokemonCard: card,
        cardState: defaultCardState,
        quantity: 1,
        quantityAvailable: 1,
        quantityReserved: 0,
        quantitySold: 0,
      });
      await this.collectionItemRepository.save(item);
      wishlistCardIds.add(card.id);
      addedCount++;
    }

    return { addedCount };
  }

  /**
   * Retrieves active marketplace offers for a missing card in a collection (COL-05).
   *
   * @param collectionId Target collection ID.
   * @param cardId Target card ID.
   * @param viewer Requesting user.
   * @returns Array of active listings.
   */
  async getMissingCardOffers(
    collectionId: string,
    cardId: string,
    viewer?: User,
  ): Promise<any[]> {
    await this.getViewableCollection(collectionId, viewer);

    const listings = await this.listingRepository.find({
      where: {
        pokemonCard: { id: cardId },
        status: ListingStatus.ACTIVE,
      },
      relations: ["seller", "cardState", "pokemonCard"],
      order: { price: "ASC" },
      take: 10,
    });

    return listings
      .filter((l) => l.quantityAvailable > 0)
      .map((l) => ({
        id: l.id,
        price: Number(l.price),
        currency: l.currency,
        quantityAvailable: l.quantityAvailable,
        sellerId: l.seller.id,
        sellerName:
          `${l.seller.firstName || ""} ${l.seller.lastName || ""}`.trim() ||
          `Vendeur #${l.seller.id}`,

        shippingCost: Number(l.shippingCost),
        cardState: l.cardState || null,
        language: l.language || null,
      }));
  }

  /**
   * Lists a duplicate copy of an owned card for sale on the marketplace (COL-05 / INT-02).
   *
   * Validates that the user does not accidentally list their last retained copy.
   *
   * @param collectionId Target collection ID.
   * @param itemId Target item ID.
   * @param user Requesting owner.
   * @param dto Price and quantity parameters.
   * @returns Created Listing entity.
   */
  async listDuplicate(
    collectionId: string,
    itemId: number,
    user: User,
    dto: ListDuplicateDto,
  ): Promise<Listing> {
    const item = await this.collectionItemRepository.findOne({
      where: {
        id: itemId,
        collection: { id: collectionId },
      },
      relations: ["collection", "collection.user", "pokemonCard", "cardState"],
    });

    if (!item) {
      throw new NotFoundException("Item introuvable dans cette collection");
    }

    if (item.collection.user?.id !== user.id) {
      throw new ForbiddenException(
        "Vous ne pouvez vendre que des cartes de vos propres collections",
      );
    }

    if (item.quantity <= 1) {
      throw new BadRequestException(
        "Cette carte n'est pas un double (quantité totale = 1). Vous ne pouvez mettre en vente que vos doubles.",
      );
    }

    if ((item.quantityAvailable ?? 0) < dto.quantity) {
      throw new BadRequestException(
        `Quantité disponible insuffisante (${item.quantityAvailable ?? 0} disponible, ${dto.quantity} demandé)`,
      );
    }

    return this.marketplaceService.create(
      {
        productKind: item.productKind,
        pokemonCardId: item.pokemonCard?.id,
        sealedProductId: item.sealedProduct?.id,
        cardState: item.cardState?.code as any,
        sealedCondition: item.sealedCondition ?? undefined,
        price: dto.price,
        currency: dto.currency,
        quantityAvailable: dto.quantity,
        description: dto.description,
        inventoryItemId: item.id,
      },
      user,
    );
  }
}

