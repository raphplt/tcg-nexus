import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";
import { CollectionItemService } from "./collection-item.service";
import {
  AddCardItemDto,
  AddSealedItemDto,
} from "./dto/add-collection-item.dto";
import { UpdateCollectionItemDto } from "./dto/update-collection-item.dto";

/**
 * Controller managing granular operations on collection items (cards and sealed products).
 */
@ApiTags("collection-item")
@ApiBearerAuth()
@Controller("collection-item")
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  /**
   * Adds a card item to the user's wishlist.
   *
   * @param userId Target user ID (must match authenticated user).
   * @param user Authenticated user.
   * @param dto Card payload.
   * @returns Added collection item entity.
   */
  @Post("wishlist/:userId")
  @ApiOperation({ summary: "Add card to user wishlist" })
  @ApiParam({ name: "userId", type: Number, description: "Target user ID" })
  async addToWishlist(
    @Param("userId", ParseIntPipe) userId: number,
    @CurrentUser() user: User,
    @Body() dto: AddCardItemDto,
  ) {
    this.collectionItemService.assertSelf(userId, user);
    return this.collectionItemService.addToWishlist(user.id, dto.pokemonCardId);
  }

  /**
   * Adds a card item to the user's favorites collection.
   *
   * @param userId Target user ID (must match authenticated user).
   * @param user Authenticated user.
   * @param dto Card payload.
   * @returns Added collection item entity.
   */
  @Post("favorites/:userId")
  @ApiOperation({ summary: "Add card to user favorites collection" })
  @ApiParam({ name: "userId", type: Number, description: "Target user ID" })
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

  /**
   * Adds a card item to a specified collection.
   *
   * @param collectionId Target collection ID.
   * @param user Authenticated user.
   * @param dto Card payload.
   * @returns Created or incremented collection item.
   */
  @Post("collection/:collectionId")
  @ApiOperation({ summary: "Add card item to specific collection" })
  @ApiParam({ name: "collectionId", type: String, description: "Collection ID" })
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

  /**
   * Adds a sealed product item to a specified collection.
   *
   * @param collectionId Target collection ID.
   * @param user Authenticated user.
   * @param dto Sealed product payload.
   * @returns Created sealed collection item.
   */
  @Post("collection/:collectionId/sealed")
  @ApiOperation({ summary: "Add sealed product item to collection" })
  @ApiParam({ name: "collectionId", type: String, description: "Collection ID" })
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

  /**
   * Adds a sealed product item to the user's wishlist.
   *
   * @param userId Target user ID (must match authenticated user).
   * @param user Authenticated user.
   * @param dto Sealed product payload.
   * @returns Added sealed collection item.
   */
  @Post("wishlist/:userId/sealed")
  @ApiOperation({ summary: "Add sealed product item to wishlist" })
  @ApiParam({ name: "userId", type: Number, description: "Target user ID" })
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

  /**
   * Updates physical attributes and condition of a collection item.
   *
   * @param id Collection item ID.
   * @param user Authenticated user.
   * @param dto Item attributes update payload.
   * @returns Updated collection item entity.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update collection item attributes" })
  @ApiParam({ name: "id", type: Number, description: "Collection item ID" })
  async updateItem(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: UpdateCollectionItemDto,
  ) {
    return this.collectionItemService.updateItem(id, dto, user);
  }

  /**
   * Splits a collection item by moving a portion of its quantity into a separate copy.
   *
   * @param id Collection item ID.
   * @param user Authenticated user.
   * @param quantity Number of copies to split off.
   * @returns Newly created separate collection item copy.
   */
  @Post(":id/split")
  @ApiOperation({ summary: "Split collection item quantity into separate copy" })
  @ApiParam({ name: "id", type: Number, description: "Collection item ID" })
  async splitItem(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body("quantity", ParseIntPipe) quantity: number,
  ) {
    return this.collectionItemService.splitItem(id, quantity, user);
  }

  /**
   * Merges two identical collection items into a single item with combined quantity.
   *
   * @param id Source collection item ID.
   * @param targetId Target collection item ID.
   * @param user Authenticated user.
   * @returns Updated target collection item entity.
   */
  @Post(":id/merge/:targetId")
  @ApiOperation({ summary: "Merge identical collection items" })
  @ApiParam({ name: "id", type: Number, description: "Source item ID" })
  @ApiParam({ name: "targetId", type: Number, description: "Target item ID" })
  async mergeItem(
    @Param("id", ParseIntPipe) id: number,
    @Param("targetId", ParseIntPipe) targetId: number,
    @CurrentUser() user: User,
  ) {
    return this.collectionItemService.mergeItem(id, targetId, user);
  }
}
