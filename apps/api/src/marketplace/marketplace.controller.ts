import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateListingDto } from "./dto/create-marketplace.dto";
import { FindAllListingsQuery } from "./dto/find-all-listings-query.dto";
import { GetCardsWithMarketplaceQueryDto } from "./dto/get-cards-marketplace-query.dto";
import { UpdateListingDto } from "./dto/update-marketplace.dto";
import { MarketplaceService } from "./marketplace.service";
import { getShippingPolicy } from "./shipping-policy";

/**
 * Controller handling marketplace listings, card catalog market data, and seller profiles.
 */
@ApiTags("marketplace")
@Controller("marketplace")
@UseGuards(ThrottlerGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /**
   * Creates a new marketplace listing for a card or sealed product.
   *
   * @param createListingDto - Payload containing listing details.
   * @param user - Authenticated user creating the listing.
   * @returns Newly created listing entity.
   */
  @ApiOperation({ summary: "Create a new marketplace listing" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("listings")
  createListing(
    @Body() createListingDto: CreateListingDto,
    @CurrentUser() user: User,
  ) {
    return this.marketplaceService.create(createListingDto, user);
  }

  /**
   * Lists all marketplace listings according to search filters and pagination.
   *
   * @param query - Filter options (search, condition, language, price range, sorting).
   * @returns Paginated listing items.
   */
  @ApiOperation({
    summary: "List marketplace listings with filters and pagination",
  })
  @Get("listings")
  @Public()
  getAllListings(@Query() query: FindAllListingsQuery) {
    return this.marketplaceService.findAll(query);
  }

  /**
   * Retrieves all listings created by the authenticated seller.
   *
   * @param user - Authenticated user.
   * @returns Array of active listings created by the user.
   */
  @ApiOperation({ summary: "List all listings created by authenticated user" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("listings/my-listings")
  getMyListings(@CurrentUser() user: User) {
    return this.marketplaceService.findBySellerId(user.id);
  }

  /**
   * Retrieves a single marketplace listing by its unique identifier.
   *
   * @param id - Unique identifier of the listing.
   * @returns Listing entity with seller details.
   */
  @ApiOperation({ summary: "Get marketplace listing by ID" })
  @Get("listings/:id")
  @Public()
  getListingById(@Param("id", ParseIntPipe) id: number) {
    return this.marketplaceService.findOne(+id);
  }

  /**
   * Partially updates an existing listing owned by the authenticated seller.
   *
   * @param id - Unique identifier of the listing.
   * @param updateListingDto - Updated listing properties.
   * @param user - Authenticated user attempting the update.
   * @returns Updated listing entity.
   */
  @ApiOperation({ summary: "Update an existing marketplace listing" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("listings/:id")
  updateListing(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateListingDto: UpdateListingDto,
    @CurrentUser() user: User,
  ) {
    return this.marketplaceService.update(+id, updateListingDto, user);
  }

  /**
   * Deletes an active listing owned by the authenticated seller.
   *
   * @param id - Unique identifier of the listing.
   * @param user - Authenticated seller.
   * @returns Deletion confirmation.
   */
  @ApiOperation({ summary: "Delete a marketplace listing" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("listings/:id")
  deleteListing(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.marketplaceService.delete(+id, user);
  }

  /**
   * Retrieves catalog cards enriched with live marketplace pricing and listing count.
   *
   * @param query - Card catalog and marketplace filters.
   * @returns Paginated cards with market pricing aggregates.
   */
  @ApiOperation({
    summary:
      "Get cards enriched with live marketplace pricing and listing volume",
  })
  @Get("cards")
  @Public()
  getCardsWithMarketplaceData(@Query() query: GetCardsWithMarketplaceQueryDto) {
    return this.marketplaceService.getCardsWithMarketplaceData(query);
  }

  /**
   * Retrieves historical price and volume statistics for a specific Pokémon card.
   *
   * @param id - Pokémon card unique identifier.
   * @param currency - Optional currency filter.
   * @param cardState - Optional physical condition filter.
   * @returns Statistical metrics for the card.
   */
  @ApiOperation({
    summary: "Get historical price and volume statistics for a card",
  })
  @Get("cards/:id/stats")
  @Public()
  @ApiQuery({ name: "currency", required: false, type: String })
  @ApiQuery({ name: "cardState", required: false, type: String })
  getCardStatistics(
    @Param("id") id: string,
    @Query("currency") currency?: string,
    @Query("cardState") cardState?: string,
  ) {
    return this.marketplaceService.getCardStatistics(id, currency, cardState);
  }

  /**
   * Retrieves recommended pricing suggestions for a card based on current market listings.
   *
   * @param id - Pokémon card unique identifier.
   * @param currency - Optional currency filter.
   * @param cardState - Optional physical condition filter.
   * @returns Price recommendation data.
   */
  @ApiOperation({ summary: "Get recommended pricing suggestions for a card" })
  @Get("cards/:id/price-suggestion")
  @Public()
  @ApiQuery({ name: "currency", required: false, type: String })
  @ApiQuery({ name: "cardState", required: false, type: String })
  getPriceSuggestion(
    @Param("id") id: string,
    @Query("currency") currency?: string,
    @Query("cardState") cardState?: string,
  ) {
    return this.marketplaceService.getPriceSuggestion(id, cardState, currency);
  }

  /**
   * Returns platform-wide shipping policies, fees, and handling deadlines.
   *
   * @returns Shipping policy configuration.
   */
  @ApiOperation({ summary: "Get platform-wide shipping policy and fees" })
  @Get("shipping-policy")
  @Public()
  getShippingPolicy() {
    return getShippingPolicy();
  }

  /**
   * Retrieves top sellers ranked by completed sales volume and revenue.
   *
   * @param limit - Maximum number of sellers to return.
   * @returns Array of top seller performance metrics.
   */
  @ApiOperation({
    summary: "Retrieve top marketplace sellers by volume and revenue",
  })
  @Get("best-sellers")
  @Public()
  @ApiQuery({ name: "limit", required: false, type: Number })
  getBestSellers(@Query("limit") limit?: number) {
    return this.marketplaceService.getBestSellers(limit ? +limit : 10);
  }

  /**
   * Retrieves public seller stats and profile information.
   *
   * @param id - Seller user identifier.
   * @returns Seller statistics entity.
   */
  @ApiOperation({ summary: "Get public seller profile and sales statistics" })
  @Get("sellers/:id")
  @Public()
  getSellerStatistics(@Param("id", ParseIntPipe) id: number) {
    return this.marketplaceService.getSellerStatistics(id);
  }

  /**
   * Retrieves active listings posted by a specific seller.
   *
   * @param id - Seller user identifier.
   * @param query - Optional pagination and sorting query.
   * @returns Paginated list of seller listings.
   */
  @ApiOperation({ summary: "List active listings for a specific seller" })
  @Get("sellers/:id/listings")
  @Public()
  getSellerListings(
    @Param("id", ParseIntPipe) id: number,
    @Query() query?: FindAllListingsQuery,
  ) {
    return this.marketplaceService.findBySellerId(id, query || {});
  }
}
