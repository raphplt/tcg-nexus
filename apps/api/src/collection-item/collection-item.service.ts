import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import {
  CardState,
  CardStateCode,
} from "src/card-state/entities/card-state.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import { UpdateCollectionItemDto } from "./dto/update-collection-item.dto";
import { CollectionItem } from "./entities/collection-item.entity";

@Injectable()
export class CollectionItemService {
  constructor(
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepo: Repository<CollectionItem>,

    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,

    @InjectRepository(Card)
    private readonly pokemonCardRepo: Repository<Card>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(CardState)
    private readonly cardStateRepo: Repository<CardState>,

    @InjectRepository(SealedProduct)
    private readonly sealedProductRepo: Repository<SealedProduct>,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  assertSelf(targetUserId: number, currentUser: User): void {
    if (targetUserId !== currentUser.id) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres collections",
      );
    }
  }

  private async getOwnedCollection(
    collectionId: string,
    user: User,
  ): Promise<Collection> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId },
      relations: ["user"],
    });

    if (!collection) {
      throw new NotFoundException({
        code: "COLLECTION_NOT_FOUND",
        message: "Collection non trouvée",
      });
    }

    if (collection.user?.id !== user.id) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres collections",
      );
    }

    return collection;
  }

  // increment SQL plutôt que save() : deux ajouts concurrents ne doivent pas
  // écraser la quantité l'un de l'autre
  private async incrementQuantity(itemId: number): Promise<CollectionItem> {
    await this.collectionItemRepo.increment({ id: itemId }, "quantity", 1);
    return this.collectionItemRepo.findOneOrFail({ where: { id: itemId } });
  }

  private async findCardItem(
    collectionId: string,
    cardId: string,
  ): Promise<CollectionItem | null> {
    return this.collectionItemRepo.findOne({
      where: {
        collection: { id: collectionId },
        pokemonCard: { id: cardId },
      },
    });
  }

  private async findSealedItem(
    collectionId: string,
    sealedProductId: string,
    condition: SealedCondition,
  ): Promise<CollectionItem | null> {
    return this.collectionItemRepo.findOne({
      where: {
        collection: { id: collectionId },
        sealedProduct: { id: sealedProductId },
        sealedCondition: condition,
      },
    });
  }

  private async getDefaultCardState(): Promise<CardState> {
    const defaultCardState = await this.cardStateRepo.findOne({
      where: { code: CardStateCode.NM },
    });

    if (!defaultCardState) {
      throw new NotFoundException(
        "CardState NM non trouvé. Veuillez d'abord seed les CardState.",
      );
    }

    return defaultCardState;
  }

  private async getCardOrFail(pokemonCardId: string): Promise<Card> {
    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId },
    });
    if (!card)
      throw new NotFoundException({
        code: "CARD_NOT_FOUND",
        message: "Carte Pokémon non trouvée",
      });
    return card;
  }

  private async getSealedProductOrFail(
    sealedProductId: string,
  ): Promise<SealedProduct> {
    const sealedProduct = await this.sealedProductRepo.findOne({
      where: { id: sealedProductId },
    });
    if (!sealedProduct)
      throw new NotFoundException({
        code: "SEALED_PRODUCT_NOT_FOUND",
        message: "Produit scellé non trouvé",
      });
    return sealedProduct;
  }

  private async findPersonalCollection(
    userId: number,
    name: string,
  ): Promise<Collection | null> {
    return this.collectionRepo.findOne({
      where: { user: { id: userId }, name },
    });
  }

  async addToWishlist(
    userId: number,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user)
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
      });

    const card = await this.getCardOrFail(pokemonCardId);

    let wishlist = await this.findPersonalCollection(userId, "Wishlist");

    if (!wishlist) {
      wishlist = await this.collectionRepo.save(
        this.collectionRepo.create({
          name: "Wishlist",
          description: "Default wishlist",
          user,
          isPublic: false,
        }),
      );
    }

    const existing = await this.findCardItem(wishlist.id, card.id);
    if (existing) {
      return this.incrementQuantity(existing.id);
    }

    const savedItem = await this.collectionItemRepo.save(
      this.collectionItemRepo.create({
        collection: wishlist,
        productKind: ProductKind.CARD,
        pokemonCard: card,
        cardState: await this.getDefaultCardState(),
        quantity: 1,
      }),
    );

    this.eventEmitter.emit("challenge.action", {
      userId: user.id,
      action: "ADD_CARD",
    });
    return savedItem;
  }

  async addToFavorites(
    userId: number,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user)
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
      });

    const card = await this.getCardOrFail(pokemonCardId);

    const favorites = await this.findPersonalCollection(userId, "Favorites");
    if (!favorites) {
      throw new NotFoundException(
        "Collection Favorites non trouvée. Vérifiez que les collections par défaut sont créées.",
      );
    }

    const existing = await this.findCardItem(favorites.id, card.id);
    if (existing) {
      return this.incrementQuantity(existing.id);
    }

    const savedItem = await this.collectionItemRepo.save(
      this.collectionItemRepo.create({
        collection: favorites,
        productKind: ProductKind.CARD,
        pokemonCard: card,
        cardState: await this.getDefaultCardState(),
        quantity: 1,
      }),
    );

    this.eventEmitter.emit("challenge.action", {
      userId: user.id,
      action: "ADD_CARD",
    });
    return savedItem;
  }

  async addToCollection(
    collectionId: string,
    pokemonCardId: string,
    user: User,
  ): Promise<CollectionItem> {
    const collection = await this.getOwnedCollection(collectionId, user);
    const card = await this.getCardOrFail(pokemonCardId);

    const existing = await this.findCardItem(collection.id, card.id);
    if (existing) {
      return this.incrementQuantity(existing.id);
    }

    const savedItem = await this.collectionItemRepo.save(
      this.collectionItemRepo.create({
        collection,
        productKind: ProductKind.CARD,
        pokemonCard: card,
        cardState: await this.getDefaultCardState(),
        quantity: 1,
      }),
    );

    this.eventEmitter.emit("challenge.action", {
      userId: user.id,
      action: "ADD_CARD",
    });
    return savedItem;
  }

  async addSealedToCollection(
    collectionId: string,
    sealedProductId: string,
    user: User,
    sealedCondition?: SealedCondition,
  ): Promise<CollectionItem> {
    const collection = await this.getOwnedCollection(collectionId, user);
    const sealedProduct = await this.getSealedProductOrFail(sealedProductId);
    const condition = sealedCondition ?? SealedCondition.SEALED;

    const existing = await this.findSealedItem(
      collection.id,
      sealedProduct.id,
      condition,
    );
    if (existing) {
      return this.incrementQuantity(existing.id);
    }

    const savedItem = await this.collectionItemRepo.save(
      this.collectionItemRepo.create({
        collection,
        productKind: ProductKind.SEALED,
        sealedProduct,
        sealedCondition: condition,
        quantity: 1,
      }),
    );

    this.eventEmitter.emit("challenge.action", {
      userId: user.id,
      action: "ADD_SEALED",
    });
    return savedItem;
  }

  async addSealedToWishlist(
    userId: number,
    sealedProductId: string,
  ): Promise<CollectionItem> {
    const sealedProduct = await this.getSealedProductOrFail(sealedProductId);

    const wishlist = await this.findPersonalCollection(userId, "Wishlist");
    if (!wishlist) {
      throw new NotFoundException(
        "Collection Wishlist non trouvée. Vérifiez les collections par défaut.",
      );
    }

    const existing = await this.findSealedItem(
      wishlist.id,
      sealedProduct.id,
      SealedCondition.SEALED,
    );
    if (existing) {
      return this.incrementQuantity(existing.id);
    }

    return this.collectionItemRepo.save(
      this.collectionItemRepo.create({
        collection: wishlist,
        productKind: ProductKind.SEALED,
        sealedProduct,
        sealedCondition: SealedCondition.SEALED,
        quantity: 1,
      }),
    );
  }

  /**
   * Updates physical metadata of an existing collection item.
   *
   * @param itemId Target item ID.
   * @param dto Updated metadata.
   * @param user Authenticated user.
   * @returns Updated CollectionItem.
   */
  async updateItem(
    itemId: number,
    dto: UpdateCollectionItemDto,
    user: User,
  ): Promise<CollectionItem> {
    const item = await this.collectionItemRepo.findOne({
      where: { id: itemId },
      relations: ["collection", "collection.user", "cardState"],
    });

    if (!item) {
      throw new NotFoundException({
        code: "ITEM_NOT_FOUND",
        message: "Item introuvable",
      });
    }

    if (item.collection.user?.id !== user.id) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres items",
      );
    }

    if (dto.cardStateCode) {
      const state = await this.cardStateRepo.findOne({
        where: { code: dto.cardStateCode as CardStateCode },
      });
      if (state) item.cardState = state;
    }
    if (dto.sealedCondition !== undefined)
      item.sealedCondition = dto.sealedCondition;
    if (dto.variant !== undefined) item.variant = dto.variant;
    if (dto.language !== undefined) item.language = dto.language;
    if (dto.printing !== undefined) item.printing = dto.printing;
    if (dto.acquiredAt !== undefined) item.acquiredAt = dto.acquiredAt;
    if (dto.acquisitionCost !== undefined)
      item.acquisitionCost = dto.acquisitionCost;
    if (dto.acquisitionCurrency !== undefined)
      item.acquisitionCurrency = dto.acquisitionCurrency;
    if (dto.storageLocation !== undefined)
      item.storageLocation = dto.storageLocation;
    if (dto.notes !== undefined) item.notes = dto.notes;
    if (dto.photoUrls !== undefined) item.photoUrls = dto.photoUrls;
    if (dto.quantity !== undefined && dto.quantity >= 1) {
      const diff = dto.quantity - item.quantity;
      item.quantity = dto.quantity;
      item.quantityAvailable = Math.max(0, item.quantityAvailable + diff);
    }

    return this.collectionItemRepo.save(item);
  }

  /**
   * Splits a grouped collection item into a separate physical inventory record (COL-02).
   *
   * @param itemId Source item ID.
   * @param splitQuantity Number of copies to separate.
   * @param user Requesting owner.
   * @returns Newly created separate CollectionItem holding the split copies.
   */
  async splitItem(
    itemId: number,
    splitQuantity: number,
    user: User,
  ): Promise<CollectionItem> {
    const item = await this.collectionItemRepo.findOne({
      where: { id: itemId },
      relations: [
        "collection",
        "collection.user",
        "pokemonCard",
        "sealedProduct",
        "cardState",
      ],
    });

    if (!item) {
      throw new NotFoundException("Item introuvable");
    }

    if (item.collection.user?.id !== user.id) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres items",
      );
    }

    if (splitQuantity < 1 || splitQuantity >= item.quantity) {
      throw new BadRequestException(
        `La quantité à séparer doit être comprise entre 1 et ${item.quantity - 1}`,
      );
    }

    if (item.quantityAvailable < splitQuantity) {
      throw new BadRequestException(
        `Quantité disponible insuffisante pour séparer (${item.quantityAvailable} disponible, ${splitQuantity} demandé)`,
      );
    }

    // Deduct from source item
    item.quantity -= splitQuantity;
    item.quantityAvailable -= splitQuantity;
    await this.collectionItemRepo.save(item);

    // Create new separate copy
    const newItem = this.collectionItemRepo.create({
      collection: item.collection,
      productKind: item.productKind,
      pokemonCard: item.pokemonCard,
      sealedProduct: item.sealedProduct,
      cardState: item.cardState,
      sealedCondition: item.sealedCondition,
      variant: item.variant,
      language: item.language,
      printing: item.printing,
      storageLocation: item.storageLocation,
      notes: item.notes,
      quantity: splitQuantity,
      quantityAvailable: splitQuantity,
      quantityReserved: 0,
      quantitySold: 0,
      provenance: {
        splitFromItemId: item.id,
        splitAt: new Date().toISOString(),
      },
    });

    return this.collectionItemRepo.save(newItem);
  }

  /**
   * Merges two compatible collection item groups into one (COL-02).
   *
   * @param sourceItemId Source item to merge from.
   * @param targetItemId Destination item to merge into.
   * @param user Requesting owner.
   * @returns Updated target CollectionItem.
   */
  async mergeItem(
    sourceItemId: number,
    targetItemId: number,
    user: User,
  ): Promise<CollectionItem> {
    if (sourceItemId === targetItemId) {
      throw new BadRequestException(
        "Impossible de fusionner un item avec lui-même",
      );
    }

    const [source, target] = await Promise.all([
      this.collectionItemRepo.findOne({
        where: { id: sourceItemId },
        relations: [
          "collection",
          "collection.user",
          "pokemonCard",
          "cardState",
        ],
      }),
      this.collectionItemRepo.findOne({
        where: { id: targetItemId },
        relations: [
          "collection",
          "collection.user",
          "pokemonCard",
          "cardState",
        ],
      }),
    ]);

    if (!source || !target) {
      throw new NotFoundException("Un des items à fusionner est introuvable");
    }

    if (
      source.collection.user?.id !== user.id ||
      target.collection.user?.id !== user.id
    ) {
      throw new ForbiddenException(
        "Vous ne pouvez fusionner que vos propres items",
      );
    }

    if (source.quantityReserved > 0) {
      throw new BadRequestException(
        "Impossible de fusionner un item actuellement réservé dans une annonce de vente",
      );
    }

    target.quantity += source.quantity;
    target.quantityAvailable += source.quantityAvailable;

    await this.collectionItemRepo.save(target);
    await this.collectionItemRepo.remove(source);

    return target;
  }
}
