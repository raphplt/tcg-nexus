import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequestLocale } from "../translation/request-locale";
import type { SupportedLocale } from "../translation/supported-locales";
import { User } from "../user/entities/user.entity";
import { CollectionBulkService } from "./collection-bulk.service";
import { CollectionCompletionService } from "./collection-completion.service";
import { CollectionValuationService } from "./collection-valuation.service";
import { CollectionService } from "./collection.service";
import {
  BulkDeleteDto,
  BulkMoveDto,
  ImportCsvDto,
  ImportResultDto,
  UndoOperationDto,
  UndoResultDto,
} from "./dto/collection-bulk.dto";
import { CollectionCardDto } from "./dto/collection-card.dto";
import { CollectionCompletionDto } from "./dto/collection-completion.dto";
import { CollectionValuationDto } from "./dto/collection-valuation.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { ListDuplicateDto } from "./dto/list-duplicate.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { Collection } from "./entities/collection.entity";

/**
 * Controller exposing endpoints for managing card collections, master sets, valuation, and bulk operations.
 */
@ApiTags("collection")
@Controller("collection")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollectionController {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly completionService: CollectionCompletionService,
    private readonly valuationService: CollectionValuationService,
    private readonly bulkService: CollectionBulkService,
  ) {}

  /**
   * Retrieves all public collections.
   *
   * @returns Array of public collection entities.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Retrieve all public collections" })
  @ApiResponse({
    status: 200,
    description: "List of public collections",
    type: [Collection],
  })
  findAll() {
    return this.collectionService.findAll();
  }

  /**
   * Retrieves public collections with pagination.
   *
   * @param page Page index number.
   * @param limit Items per page.
   * @returns Paginated collection results.
   */
  @Get("paginated")
  @Public()
  @ApiOperation({ summary: "Retrieve public collections with pagination" })
  @ApiResponse({ status: 200, description: "Paginated collections response" })
  async findAllPaginated(
    @Query("page") page: number,
    @Query("limit") limit: number,
  ) {
    return this.collectionService.findAllPaginated(page, limit);
  }

  /**
   * Retrieves collections belonging to a specific user.
   *
   * @param userId Target user ID.
   * @param user Optional authenticated caller.
   * @returns Array of user collection entities.
   */
  @Get("user/:userId")
  @Public()
  @ApiOperation({ summary: "Retrieve collections of a specific user" })
  @ApiParam({ name: "userId", description: "Target user ID" })
  @ApiResponse({
    status: 200,
    description: "Collections belonging to the user",
    type: [Collection],
  })
  async findByUserId(
    @Param("userId") userId: string,
    @CurrentUser() user?: User,
  ) {
    return this.collectionService.findByUserId(userId, user);
  }

  /**
   * Retrieves items of a collection with pagination, filtering, and search.
   *
   * @param id Collection unique identifier.
   * @param page Page index number.
   * @param limit Items per page.
   * @param search Text search query.
   * @param sortBy Field name to sort by.
   * @param sortOrder Sort direction ('ASC' or 'DESC').
   * @param setId Filter by set ID.
   * @param serieId Filter by serie ID.
   * @param rarity Filter by card rarity.
   * @param cardState Filter by physical condition state.
   * @param ownedOnly Filter only owned cards.
   * @param cardsOnly Exclude sealed items.
   * @param user Optional authenticated caller.
   * @returns Paginated collection items.
   */
  @Get(":id/items")
  @Public()
  @ApiOperation({
    summary:
      "Retrieve collection items with pagination, filtering, and search",
  })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "Paginated collection items",
  })
  @ApiResponse({ status: 404, description: "Collection not found" })
  async findCollectionItems(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("setId") setId?: string,
    @Query("serieId") serieId?: string,
    @Query("rarity") rarity?: string,
    @Query("cardState") cardState?: string,
    @Query("ownedOnly") ownedOnly?: string,
    @Query("cardsOnly") cardsOnly?: string,
    @CurrentUser() user?: User,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.collectionService.findCollectionItemsPaginated(
      id,
      pageNumber,
      limitNumber,
      search,
      sortBy,
      sortOrder,
      setId,
      serieId,
      rarity,
      cardState,
      user,
      ownedOnly === "true",
      cardsOnly === "true",
    );
  }

  /**
   * Retrieves distinct card rarities present in a Master Set collection.
   *
   * @param id Collection unique identifier.
   * @param locale Request localization.
   * @param user Optional authenticated caller.
   * @returns Array of distinct rarity strings.
   */
  @Get(":id/rarities")
  @Public()
  @ApiOperation({
    summary: "Retrieve distinct card rarities in a Master Set collection",
  })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "List of distinct rarity strings",
  })
  @ApiResponse({ status: 404, description: "Collection not found" })
  async getSetRarities(
    @Param("id") id: string,
    @RequestLocale() locale: SupportedLocale,
    @CurrentUser() user?: User,
  ): Promise<string[]> {
    return this.collectionService.getSetRarities(id, locale, user);
  }

  /**
   * Retrieves collections owned by the authenticated user.
   *
   * @param user Current authenticated user.
   * @returns Array of user collection entities.
   */
  @Get("my/collections")
  @ApiOperation({
    summary: "Retrieve collections owned by current user",
  })
  @ApiResponse({
    status: 200,
    description: "Current user collections",
    type: [Collection],
  })
  async getMyCollections(@CurrentUser() user: User): Promise<Collection[]> {
    return this.collectionService.findByUserId(user.id.toString(), user);
  }

  /**
   * Retrieves a single collection by ID.
   *
   * @param id Collection unique identifier.
   * @param user Optional authenticated caller.
   * @returns Collection entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve collection by ID" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "Collection details",
    type: Collection,
  })
  @ApiResponse({ status: 404, description: "Collection not found" })
  async findOneById(
    @Param("id") id: string,
    @CurrentUser() user?: User,
  ): Promise<Collection> {
    return this.collectionService.findOneById(id, user);
  }

  /**
   * Creates a new collection for the authenticated user.
   *
   * @param createCollectionDto Collection configuration payload.
   * @param user Current authenticated user.
   * @returns Newly created collection entity.
   */
  @Post()
  @ApiOperation({ summary: "Create a new user collection" })
  @ApiResponse({
    status: 201,
    description: "Collection successfully created",
    type: Collection,
  })
  async create(
    @Body() createCollectionDto: CreateCollectionDto,
    @CurrentUser() user: User,
  ): Promise<Collection> {
    return this.collectionService.create(createCollectionDto, user.id);
  }

  /**
   * Adds a card to the collection by card ID.
   *
   * @param id Collection unique identifier.
   * @param body Card ID payload.
   * @param user Current authenticated user.
   * @returns Updated or created collection item.
   */
  @Post(":id/items")
  @ApiOperation({ summary: "Add a card to a collection" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({ status: 201, description: "Card added to collection" })
  async addItem(
    @Param("id") id: string,
    @Body() body: CollectionCardDto,
    @CurrentUser() user: User,
  ) {
    return this.collectionService.addCardToCollection(
      id,
      body.pokemonCardId,
      user.id,
    );
  }

  /**
   * Decrements or removes a card from a collection by card ID.
   *
   * @param id Collection unique identifier.
   * @param body Card ID payload.
   * @param user Current authenticated user.
   * @returns Decrement outcome.
   */
  @Post(":id/items/remove")
  @ApiOperation({
    summary: "Decrement or remove a card from a collection",
  })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({ status: 200, description: "Card decremented or removed" })
  async removeItemByCardId(
    @Param("id") id: string,
    @Body() body: CollectionCardDto,
    @CurrentUser() user: User,
  ) {
    return this.collectionService.removeCardFromCollection(
      id,
      body.pokemonCardId,
      user.id,
    );
  }

  /**
   * Removes a specific item from a collection by item ID.
   *
   * @param id Collection unique identifier.
   * @param itemId Item unique identifier.
   * @param user Current authenticated user.
   * @returns Removal confirmation message.
   */
  @Delete(":id/items/:itemId")
  @ApiOperation({ summary: "Remove an item from a collection by ID" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiParam({ name: "itemId", description: "Collection item ID" })
  @ApiResponse({ status: 200, description: "Item successfully removed" })
  async removeItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.collectionService.removeCollectionItem(
      id,
      Number(itemId),
      user.id,
    );
    return { message: "Item supprime avec succes" };
  }

  /**
   * Updates an existing collection.
   *
   * @param id Collection unique identifier.
   * @param updateCollectionDto Metadata update payload.
   * @param user Current authenticated user.
   * @returns Updated collection entity.
   */
  @Put(":id")
  @ApiOperation({ summary: "Update collection metadata" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "Collection updated",
    type: Collection,
  })
  @ApiResponse({ status: 404, description: "Collection not found" })
  @ApiResponse({
    status: 403,
    description: "Not authorized to update this collection",
  })
  async update(
    @Param("id") id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @CurrentUser() user: User,
  ): Promise<Collection> {
    return await this.collectionService.update(
      id,
      updateCollectionDto,
      user.id,
    );
  }

  /**
   * Deletes a collection owned by the user.
   *
   * @param id Collection unique identifier.
   * @param user Current authenticated user.
   * @returns Confirmation message.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete a collection" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({ status: 200, description: "Collection successfully deleted" })
  @ApiResponse({ status: 404, description: "Collection not found" })
  @ApiResponse({
    status: 403,
    description: "Not authorized to delete this collection",
  })
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.collectionService.delete(id, user.id);
    return { message: "Collection supprimée avec succès" };
  }

  /**
   * Calculates authoritative completion metrics for a collection.
   *
   * @param id Collection unique identifier.
   * @param policy Optional completion policy override ('base' or 'master').
   * @param user Optional authenticated caller.
   * @returns Detailed completion statistics.
   */
  @Get(":id/completion")
  @Public()
  @ApiOperation({ summary: "Calculate collection completion statistics" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "Collection completion metrics",
    type: CollectionCompletionDto,
  })
  async getCompletion(
    @Param("id") id: string,
    @Query("policy") policy?: "base" | "master",
    @CurrentUser() user?: User,
  ) {
    return this.completionService.calculateCompletion(id, policy, user);
  }

  /**
   * Estimates aggregate market valuation for a collection.
   *
   * @param id Collection unique identifier.
   * @param currency Target currency code.
   * @param user Optional authenticated caller.
   * @returns Transparent market valuation metrics.
   */
  @Get(":id/valuation")
  @Public()
  @ApiOperation({ summary: "Estimate collection market valuation" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "Collection valuation estimate",
    type: CollectionValuationDto,
  })
  async getValuation(
    @Param("id") id: string,
    @Query("currency") currency?: string,
    @CurrentUser() user?: User,
  ) {
    return this.valuationService.calculateValuation(id, currency, user);
  }

  /**
   * Exports the entire collection inventory in CSV format.
   *
   * @param id Collection unique identifier.
   * @param user Optional authenticated caller.
   * @returns CSV formatted string.
   */
  @Get(":id/export/csv")
  @Public()
  @ApiOperation({ summary: "Export collection inventory as CSV" })
  @ApiParam({ name: "id", description: "Collection ID" })
  async exportCsv(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.bulkService.exportCsv(id, user);
  }

  /**
   * Imports inventory items from raw CSV text.
   *
   * @param id Collection unique identifier.
   * @param dto CSV import configuration payload.
   * @param user Current authenticated user.
   * @returns Import summary with row counts and error reports.
   */
  @Post(":id/import/csv")
  @ApiOperation({ summary: "Import collection inventory from CSV" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 201,
    description: "CSV import results",
    type: ImportResultDto,
  })
  async importCsv(
    @Param("id") id: string,
    @Body() dto: ImportCsvDto,
    @CurrentUser() user: User,
  ) {
    return this.bulkService.importCsv(id, user, dto);
  }

  /**
   * Moves selected items in bulk to a target collection.
   *
   * @param dto Bulk move configuration payload.
   * @param user Current authenticated user.
   * @returns Bulk move operation result.
   */
  @Post(":id/items/bulk-move")
  @ApiOperation({ summary: "Bulk move items to another collection" })
  @ApiParam({ name: "id", description: "Source collection ID" })
  async bulkMove(@Body() dto: BulkMoveDto, @CurrentUser() user: User) {
    return this.bulkService.bulkMove(user, dto);
  }

  /**
   * Deletes selected items in bulk from a collection.
   *
   * @param dto Bulk delete payload.
   * @param user Current authenticated user.
   * @returns Bulk delete operation result.
   */
  @Post(":id/items/bulk-delete")
  @ApiOperation({ summary: "Bulk delete items from collection" })
  @ApiParam({ name: "id", description: "Collection ID" })
  async bulkDelete(@Body() dto: BulkDeleteDto, @CurrentUser() user: User) {
    return this.bulkService.bulkDelete(user, dto);
  }

  /**
   * Compensates and reverses a recorded bulk inventory operation by ID.
   *
   * @param dto Undo operation payload with operationId.
   * @param user Current authenticated user.
   * @returns Undo compensation result.
   */
  @Post(":id/items/undo-operation")
  @ApiOperation({ summary: "Undo a recorded bulk inventory operation" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiResponse({
    status: 200,
    description: "Undo compensation outcome",
    type: UndoResultDto,
  })
  async undoOperation(
    @Body() dto: UndoOperationDto,
    @CurrentUser() user: User,
  ) {
    return this.bulkService.undoOperation(user, dto);
  }

  /**
   * Automatically adds all missing cards from a tracked set to user wishlist.
   *
   * @param id Collection unique identifier.
   * @param user Current authenticated user.
   * @returns Array of created wishlist items.
   */
  @Post(":id/wishlist-missing")
  @ApiOperation({ summary: "Add all missing cards in set to user wishlist" })
  @ApiParam({ name: "id", description: "Collection ID" })
  async wishlistMissingCards(
    @Param("id") id: string,
    @CurrentUser() user: User,
  ) {
    return this.collectionService.wishlistMissingCards(id, user.id);
  }

  /**
   * Queries active marketplace listings for a card missing from this collection.
   *
   * @param id Collection unique identifier.
   * @param cardId Target card UUID.
   * @param user Optional authenticated caller.
   * @returns Active marketplace listings for the card.
   */
  @Get(":id/cards/:cardId/offers")
  @Public()
  @ApiOperation({
    summary: "Query marketplace offers for a missing collection card",
  })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiParam({ name: "cardId", description: "Card UUID" })
  async getMissingCardOffers(
    @Param("id") id: string,
    @Param("cardId") cardId: string,
    @CurrentUser() user?: User,
  ) {
    return this.collectionService.getMissingCardOffers(id, cardId, user);
  }

  /**
   * Lists a duplicate collection item for sale directly on the marketplace.
   *
   * @param id Collection unique identifier.
   * @param itemId Collection item ID.
   * @param dto Marketplace listing configuration.
   * @param user Current authenticated user.
   * @returns Created listing entity.
   */
  @Post(":id/items/:itemId/list-duplicate")
  @ApiOperation({ summary: "List a duplicate collection item on marketplace" })
  @ApiParam({ name: "id", description: "Collection ID" })
  @ApiParam({ name: "itemId", description: "Collection item ID" })
  async listDuplicate(
    @Param("id") id: string,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() dto: ListDuplicateDto,
    @CurrentUser() user: User,
  ) {
    return this.collectionService.listDuplicate(id, itemId, user, dto);
  }
}
