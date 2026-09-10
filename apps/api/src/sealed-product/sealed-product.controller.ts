import {
  Body,
  Controller,
  DefaultValuePipe,
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
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { CreateSealedProductDto } from "./dto/create-sealed-product.dto";
import { SealedProductFilterDto } from "./dto/sealed-product-filter.dto";
import { UpdateSealedProductDto } from "./dto/update-sealed-product.dto";
import { SealedProductService } from "./sealed-product.service";

/**
 * Controller exposing catalog endpoints for sealed Pokémon TCG products (booster boxes, ETBs, tins, etc.).
 */
@ApiTags("sealed-products")
@Controller("sealed-products")
export class SealedProductController {
  constructor(private readonly sealedProductService: SealedProductService) {}

  /**
   * Retrieves all sealed products matching filter criteria.
   *
   * @param filter Filter parameters (category, set, series, search).
   * @returns Array of sealed products.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Retrieve all sealed products matching filters" })
  findAll(@Query() filter: SealedProductFilterDto) {
    return this.sealedProductService.findAll(filter);
  }

  /**
   * Retrieves a paginated list of sealed products with total count and page metadata.
   *
   * @param filter Pagination and filter parameters.
   * @returns Paginated sealed products result.
   */
  @Get("paginated")
  @Public()
  @ApiOperation({ summary: "Retrieve paginated sealed products" })
  findAllPaginated(@Query() filter: SealedProductFilterDto) {
    return this.sealedProductService.findAllPaginated(filter);
  }

  /**
   * Retrieves recently added or released sealed products.
   *
   * @param limit Maximum number of products to return (default: 8).
   * @returns Array of recent sealed products.
   */
  @Get("recent")
  @Public()
  @ApiOperation({ summary: "Retrieve recent sealed products" })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 8 })
  findRecent(
    @Query("limit", new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.sealedProductService.findRecent(limit);
  }

  /**
   * Retrieves popular sealed products based on demand or featured flags.
   *
   * @param limit Maximum number of products to return (default: 8).
   * @returns Array of popular sealed products.
   */
  @Get("popular")
  @Public()
  @ApiOperation({ summary: "Retrieve popular sealed products" })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 8 })
  findPopular(
    @Query("limit", new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.sealedProductService.findPopular(limit);
  }

  /**
   * Retrieves detailed information for a specific sealed product by ID.
   *
   * @param id Sealed product identifier.
   * @returns Sealed product entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve sealed product details by ID" })
  @ApiParam({ name: "id", description: "Sealed product identifier" })
  findOne(@Param("id") id: string) {
    return this.sealedProductService.findOne(id);
  }

  /**
   * Retrieves pricing and inventory statistics for a sealed product.
   *
   * @param id Sealed product identifier.
   * @returns Product statistics summary.
   */
  @Get(":id/stats")
  @Public()
  @ApiOperation({ summary: "Retrieve sealed product statistics" })
  @ApiParam({ name: "id", description: "Sealed product identifier" })
  getStatistics(@Param("id") id: string) {
    return this.sealedProductService.getStatistics(id);
  }

  /**
   * Creates a new sealed product catalog entry.
   *
   * @param dto Sealed product creation payload.
   * @returns Created sealed product entity.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post()
  @ApiOperation({ summary: "Create a new sealed product" })
  create(@Body() dto: CreateSealedProductDto) {
    return this.sealedProductService.create(dto);
  }

  /**
   * Updates an existing sealed product entry.
   *
   * @param id Sealed product identifier.
   * @param dto Updated fields payload.
   * @returns Updated sealed product entity.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch(":id")
  @ApiOperation({ summary: "Update an existing sealed product" })
  @ApiParam({ name: "id", description: "Sealed product identifier" })
  update(@Param("id") id: string, @Body() dto: UpdateSealedProductDto) {
    return this.sealedProductService.update(id, dto);
  }

  /**
   * Removes a sealed product from the catalog.
   *
   * @param id Sealed product identifier.
   * @returns Deletion confirmation.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Delete(":id")
  @ApiOperation({ summary: "Delete a sealed product" })
  @ApiParam({ name: "id", description: "Sealed product identifier" })
  remove(@Param("id") id: string) {
    return this.sealedProductService.remove(id);
  }

  /**
   * Seeds sealed product definitions from local JSON seed file.
   *
   * @returns Seed execution summary.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post("seed")
  @ApiOperation({ summary: "Seed sealed products from JSON data" })
  seed() {
    return this.sealedProductService.seedFromJson();
  }
}
