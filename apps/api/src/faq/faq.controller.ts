import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { GetFaqDto } from "./dto/get-faq.dto";
import { Faq } from "./entities/faq.entity";
import { FaqService } from "./faq.service";

/**
 * Controller exposing public endpoints for FAQ knowledge base queries.
 */
@ApiTags("faq")
@Controller("faq")
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * Retrieves FAQ items filtered optionally by category or search term.
   *
   * @param query - Filter criteria (category, search query).
   * @returns List of matching FAQ entries.
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: "Retrieve FAQ entries with optional category and search filters",
  })
  @ApiResponse({
    status: 200,
    description: "List of matching FAQ entries ordered by priority.",
    type: [Faq],
  })
  findAll(@Query() query: GetFaqDto) {
    return this.faqService.findAll(query);
  }
}

