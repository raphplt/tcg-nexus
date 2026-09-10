import { Controller, Get, Query, ValidationPipe } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../auth/decorators/public.decorator";
import { GlobalSearchDto, GlobalSearchResult } from "./dto/global-search.dto";
import {
  SuggestionsDetailResult,
  SuggestionsPreviewResult,
} from "./dto/suggestions.dto";
import { SearchService } from "./search.service";

/**
 * Controller handling global multi-entity search and instant autocomplete suggestions.
 */
@ApiTags("search")
@Controller("search")
// Public and query-heavy (ILIKE scans across several tables): tighter quota
// than the global default, per IP.
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Performs global multi-domain search across cards, tournaments, players, and marketplace listings.
   *
   * @param searchDto - Query criteria, type filter, sorting, and pagination.
   * @returns Aggregated and prioritized search results.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Perform global search across multiple entity domains" })
  @ApiResponse({ status: 200, description: "Search results matching query criteria." })
  async globalSearch(
    @Query(new ValidationPipe({ transform: true })) searchDto: GlobalSearchDto,
  ): Promise<GlobalSearchResult> {
    return this.searchService.globalSearch(searchDto);
  }

  /**
   * Retrieves string suggestions for search autocompletion.
   *
   * @param query - Input query prefix or term.
   * @param limit - Optional maximum number of suggestions.
   * @returns List of suggestion strings.
   */
  @Public()
  @Get("suggestions")
  @ApiOperation({ summary: "Retrieve search autocompletion suggestions" })
  @ApiQuery({ name: "q", description: "Search query text", example: "Charizard" })
  @ApiQuery({ name: "limit", required: false, description: "Maximum suggestions to return", example: 10 })
  @ApiResponse({ status: 200, description: "List of suggestion strings." })
  async getSearchSuggestions(
    @Query("q") query: string,
    @Query("limit") limit?: number,
  ): Promise<string[]> {
    return this.searchService.getSearchSuggestions(query, limit);
  }

  /**
   * Retrieves lightweight preview suggestions grouped by category.
   *
   * @param query - Input query prefix or term.
   * @param limit - Optional maximum number of suggestions.
   * @returns Categorized suggestions with preview thumbnails.
   */
  @Public()
  @Get("suggestions/preview")
  @ApiOperation({ summary: "Retrieve lightweight categorized suggestions preview" })
  @ApiQuery({ name: "q", description: "Search query text", example: "Charizard" })
  @ApiQuery({ name: "limit", required: false, description: "Maximum suggestions to return", example: 5 })
  @ApiResponse({ status: 200, description: "Categorized preview suggestions." })
  async getSuggestionsPreview(
    @Query("q") query: string,
    @Query("limit") limit?: number,
  ): Promise<SuggestionsPreviewResult> {
    return this.searchService.getSuggestionsPreview(query, limit);
  }

  /**
   * Retrieves enriched detailed suggestions with full descriptions and metadata.
   *
   * @param query - Input query prefix or term.
   * @param limit - Optional maximum number of suggestions.
   * @returns Detailed suggestions with rich metadata.
   */
  @Public()
  @Get("suggestions/detail")
  @ApiOperation({ summary: "Retrieve rich suggestions with full metadata" })
  @ApiQuery({ name: "q", description: "Search query text", example: "Charizard" })
  @ApiQuery({ name: "limit", required: false, description: "Maximum suggestions to return", example: 5 })
  @ApiResponse({ status: 200, description: "Detailed suggestions with metadata." })
  async getSuggestionsDetail(
    @Query("q") query: string,
    @Query("limit") limit?: number,
  ): Promise<SuggestionsDetailResult> {
    return this.searchService.getSuggestionsDetail(query, limit);
  }
}

