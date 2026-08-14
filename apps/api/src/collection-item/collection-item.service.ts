import {
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
}
