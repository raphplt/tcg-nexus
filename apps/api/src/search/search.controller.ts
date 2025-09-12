import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { SearchService } from './search.service';
import { GlobalSearchDto, GlobalSearchResult } from './dto/global-search.dto';
import {
  SuggestionsPreviewResult,
  SuggestionsDetailResult
} from './dto/suggestions.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(
    @Query(new ValidationPipe({ transform: true })) searchDto: GlobalSearchDto
  ): Promise<GlobalSearchResult> {
    return this.searchService.globalSearch(searchDto);
  }

  @Get('suggestions')
  async getSearchSuggestions(
    @Query('q') query: string,
    @Query('limit') limit?: number
  ): Promise<string[]> {
    return this.searchService.getSearchSuggestions(query, limit);
  }

  @Get('suggestions/preview')
  async getSuggestionsPreview(
    @Query('q') query: string,
    @Query('limit') limit?: number
  ): Promise<SuggestionsPreviewResult> {
    return this.searchService.getSuggestionsPreview(query, limit);
  }

  @Get('suggestions/detail')
  async getSuggestionsDetail(
    @Query('q') query: string,
    @Query('limit') limit?: number
  ): Promise<SuggestionsDetailResult> {
    return this.searchService.getSuggestionsDetail(query, limit);
  }
}
