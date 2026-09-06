import { RequestLocale } from "src/translation/request-locale";
import type { SupportedLocale } from "src/translation/supported-locales";
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
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CollectionBulkService } from "./collection-bulk.service";
import { CollectionCompletionService } from "./collection-completion.service";
import { CollectionValuationService } from "./collection-valuation.service";
import { CollectionService } from "./collection.service";
import {
  BulkDeleteDto,
  BulkMoveDto,
  ImportCsvDto,
  UndoOperationDto,
} from "./dto/collection-bulk.dto";
import { CollectionCardDto } from "./dto/collection-card.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { ListDuplicateDto } from "./dto/list-duplicate.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { Collection } from "./entities/collection.entity";

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


  @Get()
  @Public()
  @ApiOperation({ summary: "Récupérer toutes les collections publiques" })
  @ApiResponse({
    status: 200,
    description: "Liste des collections",
    type: [Collection],
  })
  findAll() {
    return this.collectionService.findAll();
  }

  @Get("paginated")
  @Public()
  @ApiOperation({ summary: "Récupérer les collections avec pagination" })
  @ApiResponse({ status: 200, description: "Collections paginées" })
  async findAllPaginated(
    @Query("page") page: number,
    @Query("limit") limit: number,
  ) {
    return this.collectionService.findAllPaginated(page, limit);
  }

  @Get("user/:userId")
  @Public()
  @ApiOperation({ summary: "Récupérer les collections d'un utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Collections de l'utilisateur",
    type: [Collection],
  })
  async findByUserId(
    @Param("userId") userId: string,
    @CurrentUser() user?: User,
  ) {
    return this.collectionService.findByUserId(userId, user);
  }

  @Get(":id/items")
  @Public()
  @ApiOperation({
    summary:
      "Récupérer les items d'une collection avec pagination et recherche",
  })
  @ApiResponse({
    status: 200,
    description: "Items de la collection paginés",
  })
  @ApiResponse({ status: 404, description: "Collection non trouvée" })
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

  @Get(":id/rarities")
  @Public()
  @ApiOperation({
    summary: "Récupérer les raretés distinctes d'un Master Set",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des raretés",
  })
  @ApiResponse({ status: 404, description: "Collection non trouvée" })
  async getSetRarities(
    @Param("id") id: string,
    @RequestLocale() locale: SupportedLocale,
    @CurrentUser() user?: User,
  ): Promise<string[]> {
    return this.collectionService.getSetRarities(id, locale, user);
  }

  @Get("my/collections")
  @ApiOperation({
    summary: "Récupérer les collections de l'utilisateur connecté",
  })
  @ApiResponse({
    status: 200,
    description: "Collections de l'utilisateur",
    type: [Collection],
  })
  async getMyCollections(@CurrentUser() user: User): Promise<Collection[]> {
    return this.collectionService.findByUserId(user.id.toString(), user);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Récupérer une collection par son ID" })
  @ApiResponse({
    status: 200,
    description: "Collection trouvée",
    type: Collection,
  })
  @ApiResponse({ status: 404, description: "Collection non trouvée" })
  async findOneById(
    @Param("id") id: string,
    @CurrentUser() user?: User,
  ): Promise<Collection> {
    return this.collectionService.findOneById(id, user);
  }

  @Post()
  @ApiOperation({ summary: "Créer une nouvelle collection" })
  @ApiResponse({
    status: 201,
    description: "Collection créée",
    type: Collection,
  })
  async create(
    @Body() createCollectionDto: CreateCollectionDto,
    @CurrentUser() user: User,
  ): Promise<Collection> {
    return this.collectionService.create(createCollectionDto, user.id);
  }

  @Post(":id/items")
  @ApiOperation({ summary: "Ajouter une carte a une collection" })
  @ApiResponse({ status: 201, description: "Carte ajoutee a la collection" })
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

  @Post(":id/items/remove")
  @ApiOperation({
    summary: "Retirer ou décrémenter une carte d'une collection",
  })
  @ApiResponse({ status: 200, description: "Carte décrémentée ou retirée" })
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

  @Delete(":id/items/:itemId")
  @ApiOperation({ summary: "Supprimer un item d'une collection" })
  @ApiResponse({ status: 200, description: "Item supprime" })
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

  @Put(":id")
  @ApiOperation({ summary: "Mettre à jour une collection" })
  @ApiResponse({
    status: 200,
    description: "Collection mise à jour",
    type: Collection,
  })
  @ApiResponse({ status: 404, description: "Collection non trouvée" })
  @ApiResponse({
    status: 403,
    description: "Non autorisé à modifier cette collection",
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

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer une collection" })
  @ApiResponse({ status: 200, description: "Collection supprimée" })
  @ApiResponse({ status: 404, description: "Collection non trouvée" })
  @ApiResponse({
    status: 403,
    description: "Non autorisé à supprimer cette collection",
  })
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.collectionService.delete(id, user.id);
    return { message: "Collection supprimée avec succès" };
  }

  @Get(":id/completion")
  @Public()
  @ApiOperation({ summary: "Calculer la complétion d'une collection" })
  async getCompletion(
    @Param("id") id: string,
    @Query("policy") policy?: "base" | "master",
    @CurrentUser() user?: User,
  ) {
    return this.completionService.calculateCompletion(id, policy, user);
  }

  @Get(":id/valuation")
  @Public()
  @ApiOperation({ summary: "Estimer la valeur marchande d'une collection" })
  async getValuation(
    @Param("id") id: string,
    @Query("currency") currency?: string,
    @CurrentUser() user?: User,
  ) {
    return this.valuationService.calculateValuation(id, currency, user);
  }

  @Get(":id/export/csv")
  @Public()
  @ApiOperation({ summary: "Exporter l'inventaire en format CSV" })
  async exportCsv(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.bulkService.exportCsv(id, user);
  }

  @Post(":id/import/csv")
  @ApiOperation({ summary: "Importer un inventaire CSV" })
  async importCsv(
    @Param("id") id: string,
    @Body() dto: ImportCsvDto,
    @CurrentUser() user: User,
  ) {
    return this.bulkService.importCsv(id, user, dto);
  }

  @Post(":id/items/bulk-move")
  @ApiOperation({
    summary: "Déplacer des items en masse vers une autre collection",
  })
  async bulkMove(@Body() dto: BulkMoveDto, @CurrentUser() user: User) {
    return this.bulkService.bulkMove(user, dto);
  }

  @Post(":id/items/bulk-delete")
  @ApiOperation({ summary: "Supprimer des items en masse" })
  async bulkDelete(@Body() dto: BulkDeleteDto, @CurrentUser() user: User) {
    return this.bulkService.bulkDelete(user, dto);
  }

  @Post(":id/items/undo-operation")
  @ApiOperation({ summary: "Annuler une opération d'inventaire par son ID" })
  async undoOperation(@Body() dto: UndoOperationDto, @CurrentUser() user: User) {
    return this.bulkService.undoOperation(user, dto);
  }

  @Post(":id/wishlist-missing")
  @ApiOperation({
    summary: "Ajouter toutes les cartes manquantes à la Wishlist",
  })
  async wishlistMissingCards(
    @Param("id") id: string,
    @CurrentUser() user: User,
  ) {
    return this.collectionService.wishlistMissingCards(id, user.id);
  }

  @Get(":id/cards/:cardId/offers")
  @Public()
  @ApiOperation({
    summary: "Consulter les offres marketplace pour une carte manquante",
  })
  async getMissingCardOffers(
    @Param("id") id: string,
    @Param("cardId") cardId: string,
    @CurrentUser() user?: User,
  ) {
    return this.collectionService.getMissingCardOffers(id, cardId, user);
  }

  @Post(":id/items/:itemId/list-duplicate")
  @ApiOperation({ summary: "Mettre en vente un double sur le marketplace" })
  async listDuplicate(
    @Param("id") id: string,
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() dto: ListDuplicateDto,
    @CurrentUser() user: User,
  ) {
    return this.collectionService.listDuplicate(id, itemId, user, dto);
  }
}

