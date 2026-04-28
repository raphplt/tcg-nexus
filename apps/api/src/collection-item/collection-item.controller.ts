import { Body, Controller, Param, Post } from "@nestjs/common";
import { Public } from "src/auth/decorators/public.decorator";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { CollectionItemService } from "./collection-item.service";

@Controller("collection-item")
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  @Post("wishlist/:userId")
  @Public()
  async addToWishlist(
    @Param("userId") userId: string,
    @Body("pokemonCardId") pokemonCardId: string,
  ) {
    return this.collectionItemService.addToWishlist(userId, pokemonCardId);
  }

  @Post("favorites/:userId")
  @Public()
  async addToFavorites(
    @Param("userId") userId: string,
    @Body("pokemonCardId") pokemonCardId: string,
  ) {
    return this.collectionItemService.addToFavorites(userId, pokemonCardId);
  }

  @Post("collection/:collectionId")
  @Public()
  async addToCollection(
    @Param("collectionId") collectionId: string,
    @Body("pokemonCardId") pokemonCardId: string,
  ) {
    return this.collectionItemService.addToCollection(
      collectionId,
      pokemonCardId,
    );
  }

  @Post("collection/:collectionId/sealed")
  @Public()
  async addSealedToCollection(
    @Param("collectionId") collectionId: string,
    @Body("sealedProductId") sealedProductId: string,
    @Body("sealedCondition") sealedCondition?: SealedCondition,
  ) {
    return this.collectionItemService.addSealedToCollection(
      collectionId,
      sealedProductId,
      sealedCondition,
    );
  }

  @Post("wishlist/:userId/sealed")
  @Public()
  async addSealedToWishlist(
    @Param("userId") userId: string,
    @Body("sealedProductId") sealedProductId: string,
  ) {
    return this.collectionItemService.addSealedToWishlist(
      userId,
      sealedProductId,
    );
  }
}
