import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
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

  /**
   * Adds a Pokémon card to a user's wishlist collection.
   *
   * @param userId Target user ID.
   * @param pokemonCardId Target card ID.
   * @returns Created or updated CollectionItem entity.
   */
  async addToWishlist(
    userId: number | string,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === "string" ? Number(userId) : userId;

    // Ensure user exists
    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
      });

    // Ensure card exists
    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId },
    });
    if (!card) throw new NotFoundException({
        code: "CARD_NOT_FOUND",
        message: "Carte Pokémon non trouvée",
      });

    // Retrieve existing Wishlist collection
    let wishlist = await this.collectionRepo.findOne({
      where: {
        user: { id: userIdNum },
        name: "Wishlist",
      },
      relations: ["items", "items.pokemonCard"],
    });

    if (!wishlist) {
      console.warn(
        `No wishlist found for user ${userIdNum}. Creating new default wishlist.`,
      );
      wishlist = this.collectionRepo.create({
        name: "Wishlist",
        description: "Default wishlist",
        user,
        isPublic: false,
      });
      wishlist = await this.collectionRepo.save(wishlist);
    }

    // Check if card already exists in wishlist
    let item = wishlist.items?.find((i) => i.pokemonCard?.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    // Retrieve default Near Mint (NM) card state
    const defaultCardState = await this.cardStateRepo.findOne({
      where: { code: CardStateCode.NM },
    });

    if (!defaultCardState) {
      throw new NotFoundException(
        "CardState NM non trouvé. Veuillez d'abord seed les CardState.",
      );
    }

    item = this.collectionItemRepo.create({
      collection: wishlist,
      pokemonCard: card,
      cardState: defaultCardState,
      quantity: 1,
    });

    const savedItem = await this.collectionItemRepo.save(item);
    this.eventEmitter.emit("challenge.action", {
      userId: user.id,
      action: "ADD_CARD",
    });
    return savedItem;
  }

  /**
   * Adds a Pokémon card to a user's Favorites collection.
   *
   * @param userId Target user ID.
   * @param pokemonCardId Target card ID.
   * @returns Created or updated CollectionItem entity.
   */
  async addToFavorites(
    userId: number | string,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === "string" ? Number(userId) : userId;

    // Ensure user exists
    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
      });

    // Ensure card exists
    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId },
    });
    if (!card) throw new NotFoundException({
        code: "CARD_NOT_FOUND",
        message: "Carte Pokémon non trouvée",
      });

    // Retrieve Favorites collection
    const favorites = await this.collectionRepo.findOne({
      where: {
        user: { id: userIdNum },
        name: "Favorites",
      },
      relations: ["items", "items.pokemonCard"],
    });

    if (!favorites) {
      throw new NotFoundException(
        "Collection Favorites non trouvée. Vérifiez que les collections par défaut sont créées.",
      );
    }

    // Check if card already exists in favorites
    let item = favorites.items?.find((i) => i.pokemonCard?.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    // Retrieve default NM card state
    const defaultCardState = await this.cardStateRepo.findOne({
      where: { code: CardStateCode.NM },
    });

    if (!defaultCardState) {
      throw new NotFoundException(
        "CardState NM non trouvé. Veuillez d'abord seed les CardState.",
      );
    }

    item = this.collectionItemRepo.create({
      collection: favorites,
      pokemonCard: card,
      cardState: defaultCardState,
      quantity: 1,
    });

    const savedItem = await this.collectionItemRepo.save(item);
    this.eventEmitter.emit("challenge.action", {
      userId: user.id,
      action: "ADD_CARD",
    });
    return savedItem;
  }

  /**
   * Adds a Pokémon card to a specific collection by collection ID.
   *
   * @param collectionId Target collection ID.
   * @param pokemonCardId Target card ID.
   * @returns Created or updated CollectionItem entity.
   */
  async addToCollection(
    collectionId: number | string,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId as string },
      relations: ["items", "items.pokemonCard", "user"],
    });
    if (!collection) throw new NotFoundException({
        code: "COLLECTION_NOT_FOUND",
        message: "Collection non trouvée",
      });

    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId },
    });
    if (!card) throw new NotFoundException({
        code: "CARD_NOT_FOUND",
        message: "Carte Pokémon non trouvée",
      });

    let item = collection.items?.find((i) => i.pokemonCard?.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    const defaultCardState = await this.cardStateRepo.findOne({
      where: { code: CardStateCode.NM },
    });

    if (!defaultCardState) {
      throw new NotFoundException(
        "CardState NM non trouvé. Veuillez d'abord seed les CardState.",
      );
    }

    item = this.collectionItemRepo.create({
      collection,
      productKind: ProductKind.CARD,
      pokemonCard: card,
      cardState: defaultCardState,
      quantity: 1,
    });

    const savedItem = await this.collectionItemRepo.save(item);
    if (collection.user?.id) {
      this.eventEmitter.emit("challenge.action", {
        userId: collection.user.id,
        action: "ADD_CARD",
      });
    }
    return savedItem;
  }

  /**
   * Adds a sealed product to a specific collection.
   *
   * @param collectionId Target collection ID.
   * @param sealedProductId Target sealed product ID.
   * @param sealedCondition Optional item condition (defaults to SEALED).
   * @returns Created or updated CollectionItem entity.
   */
  async addSealedToCollection(
    collectionId: number | string,
    sealedProductId: string,
    sealedCondition?: SealedCondition,
  ): Promise<CollectionItem> {
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId as string },
      relations: ["items", "items.sealedProduct", "user"],
    });
    if (!collection) throw new NotFoundException({
        code: "COLLECTION_NOT_FOUND",
        message: "Collection non trouvée",
      });

    const sealedProduct = await this.sealedProductRepo.findOne({
      where: { id: sealedProductId },
    });
    if (!sealedProduct)
      throw new NotFoundException({
        code: "SEALED_PRODUCT_NOT_FOUND",
        message: "Produit scellé non trouvé",
      });

    const condition = sealedCondition ?? SealedCondition.SEALED;

    let item = collection.items?.find(
      (i) =>
        i.sealedProduct?.id === sealedProduct.id &&
        i.sealedCondition === condition,
    );

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    item = this.collectionItemRepo.create({
      collection,
      productKind: ProductKind.SEALED,
      sealedProduct,
      sealedCondition: condition,
      quantity: 1,
    });

    const savedItem = await this.collectionItemRepo.save(item);
    if (collection.user?.id) {
      this.eventEmitter.emit("challenge.action", {
        userId: collection.user.id,
        action: "ADD_SEALED",
      });
    }
    return savedItem;
  }

  /**
   * Adds a sealed product to a user's wishlist collection.
   *
   * @param userId Target user ID.
   * @param sealedProductId Target sealed product ID.
   * @returns Created or updated CollectionItem entity.
   */
  async addSealedToWishlist(
    userId: number | string,
    sealedProductId: string,
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === "string" ? Number(userId) : userId;

    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
      });

    const sealedProduct = await this.sealedProductRepo.findOne({
      where: { id: sealedProductId },
    });
    if (!sealedProduct)
      throw new NotFoundException({
        code: "SEALED_PRODUCT_NOT_FOUND",
        message: "Produit scellé non trouvé",
      });

    const wishlist = await this.collectionRepo.findOne({
      where: {
        user: { id: userIdNum },
        name: "Wishlist",
      },
      relations: ["items", "items.sealedProduct"],
    });
    if (!wishlist) {
      throw new NotFoundException(
        "Collection Wishlist non trouvée. Vérifiez les collections par défaut.",
      );
    }

    let item = wishlist.items?.find(
      (i) => i.sealedProduct?.id === sealedProduct.id,
    );

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    item = this.collectionItemRepo.create({
      collection: wishlist,
      productKind: ProductKind.SEALED,
      sealedProduct,
      sealedCondition: SealedCondition.SEALED,
      quantity: 1,
    });

    return this.collectionItemRepo.save(item);
  }
}
