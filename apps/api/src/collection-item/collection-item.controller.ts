import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/user/entities/user.entity";
import { CollectionItemService } from "./collection-item.service";
import {
  AddCardItemDto,
  AddSealedItemDto,
} from "./dto/add-collection-item.dto";

@ApiTags("collection-item")
@ApiBearerAuth()
@Controller("collection-item")
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  @Post("wishlist/:userId")
  async addToWishlist(
    @Param("userId", ParseIntPipe) userId: number,
    @CurrentUser() user: User,
    @Body() dto: AddCardItemDto,
  ) {
    this.collectionItemService.assertSelf(userId, user);
    return this.collectionItemService.addToWishlist(user.id, dto.pokemonCardId);
  }

  @Post("favorites/:userId")
  async addToFavorites(
    @Param("userId", ParseIntPipe) userId: number,
    @CurrentUser() user: User,
    @Body() dto: AddCardItemDto,
  ) {
    this.collectionItemService.assertSelf(userId, user);
    return this.collectionItemService.addToFavorites(
      user.id,
      dto.pokemonCardId,
    );
  }

  @Post("collection/:collectionId")
  async addToCollection(
    @Param("collectionId") collectionId: string,
    @CurrentUser() user: User,
    @Body() dto: AddCardItemDto,
  ) {
    return this.collectionItemService.addToCollection(
      collectionId,
      dto.pokemonCardId,
      user,
    );
  }

  @Post("collection/:collectionId/sealed")
  async addSealedToCollection(
    @Param("collectionId") collectionId: string,
    @CurrentUser() user: User,
    @Body() dto: AddSealedItemDto,
  ) {
    return this.collectionItemService.addSealedToCollection(
      collectionId,
      dto.sealedProductId,
      user,
      dto.sealedCondition,
    );
  }

  @Post("wishlist/:userId/sealed")
  async addSealedToWishlist(
    @Param("userId", ParseIntPipe) userId: number,
    @CurrentUser() user: User,
    @Body() dto: AddSealedItemDto,
  ) {
    this.collectionItemService.assertSelf(userId, user);
    return this.collectionItemService.addSealedToWishlist(
      user.id,
      dto.sealedProductId,
    );
  }
}
