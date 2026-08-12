import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import {
  CardState,
  CardStateCode,
} from "src/card-state/entities/card-state.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { Repository } from "typeorm";
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
   * Finds all collections owned by a specific user.
   *
   * @param userId Target user ID.
   * @returns User's collections.
   */
  async findByUserId(userId: string): Promise<Collection[]> {
    return await this.collectionRepository.find({
      where: { user: { id: Number(userId) } },
      relations: ["user", "items", "masterSet"],
    });
  }

  /**
   * Finds a collection by ID.
   *
   * @param id Collection UUID.
   * @returns Collection entity.
   */
  async findOneById(id: string): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ["items", "user", "masterSet"],
    });
    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }
    return collection;
  }

  /**
   * Creates a new user collection or Master Set collection.
   *
   * @param createCollectionDto Collection creation parameters.
   * @returns Created Collection entity.
   */
  async create(createCollectionDto: CreateCollectionDto): Promise<Collection> {
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

      // Prevent duplicate collection creation for the same user and master set
      const existing = await this.collectionRepository.findOne({
        where: {
          user: { id: Number(createCollectionDto.userId) },
          masterSet: { id: set.id },
        },
      });
      if (existing) {
        throw new ForbiddenException(
          `Un Master Set existe déjà pour l'extension ${set.name}.`,
        );
      }

      masterSet = set;
    }

    if (!masterSet && !createCollectionDto.name) {
      throw new ForbiddenException("Le nom de la collection est requis.");
    }

    const collection = this.collectionRepository.create({
      name: masterSet
        ? `Master Set — ${masterSet.name}`
        : createCollectionDto.name,
      description: masterSet
        ? `Master Set pour l'extension ${masterSet.name}`
        : createCollectionDto.description,
      isPublic: createCollectionDto.isPublic || false,
    });
    collection.user = { id: Number(createCollectionDto.userId) } as User;
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
    // Ensure collection exists and load masterSet relation
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
      relations: ["masterSet"],
    });
    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }

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
        .where("set.id = :masterSetId", { masterSetId });

      if (search) {
        queryBuilder.andWhere(
          "(card.name ILIKE :search OR card.rarity ILIKE :search OR set.name ILIKE :search)",
          { search: `%${search}%` },
        );
      }

      if (setId) {
        queryBuilder.andWhere("set.id = :setId", { setId });
      }
      if (serieId) {
        queryBuilder.andWhere("serie.id = :serieId", { serieId });
      }
      if (rarity) {
        queryBuilder.andWhere("card.rarity = :rarity", { rarity });
      }
      if (cardState) {
        queryBuilder.andWhere("item.cardState.code = :cardState", {
          cardState,
        });
      }

      queryBuilder.orderBy("card.localId", "ASC");

      const totalItems = await queryBuilder.getCount();
      const cards = await queryBuilder.skip(skip).take(limit).getMany();

      const data = cards.map((card) => {
        const item = card.collectionItems?.[0];
        return {
          id: item?.id ?? null,
          quantity: item?.quantity ?? 0,
          added_at: item?.added_at ?? null,
          pokemonCard: {
            id: card.id,
            name: card.name,
            image: card.image,
            localId: card.localId,
            rarity: card.rarity,
            category: card.category,
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
      .leftJoinAndSelect("item.cardState", "cardState")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("item.collection.id = :collectionId", { collectionId });

    if (search) {
      queryBuilder.andWhere(
        "(pokemonCard.name ILIKE :search OR pokemonCard.rarity ILIKE :search OR set.name ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (setId) {
      queryBuilder.andWhere("set.id = :setId", { setId });
    }

    if (serieId) {
      queryBuilder.andWhere("serie.id = :serieId", { serieId });
    }

    if (rarity) {
      queryBuilder.andWhere("pokemonCard.rarity = :rarity", { rarity });
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
      queryBuilder.orderBy(sortField, sortOrder);
    } else {
      queryBuilder.orderBy(`item.${sortField}`, sortOrder);
    }

    const totalItems = await queryBuilder.getCount();
    const items = await queryBuilder.skip(skip).take(limit).getMany();
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

  async getSetRarities(collectionId: string): Promise<string[]> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
      relations: ["masterSet"],
    });
    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`,
      );
    }
    if (!collection.masterSet) {
      return [];
    }

    const result = await this.cardRepository
      .createQueryBuilder("card")
      .select("DISTINCT card.rarity", "rarity")
      .innerJoin("card.set", "set")
      .where("set.id = :setId", { setId: collection.masterSet.id })
      .andWhere("card.rarity IS NOT NULL")
      .orderBy("card.rarity", "ASC")
      .getRawMany();

    return result.map((r: { rarity: string }) => r.rarity);
  }
}
