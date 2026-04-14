import { Injectable, NotFoundException } from "@nestjs/common";
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
   * Ajouter une carte Pokémon dans la wishlist d'un user
   */
  async addToWishlist(
    userId: number | string,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === "string" ? Number(userId) : userId;

    // Vérifier que l'utilisateur existe
    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException("Utilisateur non trouvé");

    // Vérifier que la carte existe
    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId },
    });
    if (!card) throw new NotFoundException("Carte Pokémon non trouvée");

    // Récupérer la wishlist existante (insensible à la casse)
    let wishlist = await this.collectionRepo.findOne({
      where: {
        user: { id: userIdNum },
        name: "Wishlist", // Utiliser le nom avec majuscule pour cohérence
      },
      relations: ["items", "items.pokemonCard"],
    });

    if (!wishlist) {
      // Créer une wishlist uniquement si elle n'existe vraiment pas (cela ne devrait pas arriver)
      console.warn(
        `Aucune wishlist trouvée pour l'utilisateur ${userIdNum}. Création d'une wishlist d'urgence.`,
      );
      wishlist = this.collectionRepo.create({
        name: "Wishlist",
        description: "Default wishlist (auto-generated)",
        user,
        isPublic: false,
      });
      wishlist = await this.collectionRepo.save(wishlist);
    }

    // Vérifier si la carte est déjà dans la wishlist
    let item = wishlist.items?.find((i) => i.pokemonCard?.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    // Récupérer le CardState NM par défaut
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
   * Ajouter une carte Pokémon aux Favorites d'un user
   */
  async addToFavorites(
    userId: number | string,
    pokemonCardId: string,
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === "string" ? Number(userId) : userId;

    // Vérifier que l'utilisateur existe
    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException("Utilisateur non trouvé");

    // Vérifier que la carte existe
    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId },
    });
    if (!card) throw new NotFoundException("Carte Pokémon non trouvée");

    // Récupérer les Favorites
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

    // Vérifier si la carte est déjà dans les Favorites
    let item = favorites.items?.find((i) => i.pokemonCard?.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    // Récupérer le CardState NM par défaut
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
   * Ajouter un produit scellé à la wishlist d'un user.
   */
  async addSealedToWishlist(
    userId: number | string,
    sealedProductId: string,
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === "string" ? Number(userId) : userId;

    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException("Utilisateur non trouvé");

    const sealedProduct = await this.sealedProductRepo.findOne({
      where: { id: sealedProductId },
    });
    if (!sealedProduct)
      throw new NotFoundException("Produit scellé non trouvé");

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
