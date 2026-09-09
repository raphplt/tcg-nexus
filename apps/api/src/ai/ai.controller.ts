import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { AiService } from "./ai.service";
import { DeckAnalysisResponseDto } from "./dto/analyze-deck-response.dto";
import { AnalyzeDeckDto } from "./dto/analyze-deck.dto";

/**
 * Controller exposing deck analysis and synergy evaluation endpoints.
 */
@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Analyzes deck composition, type distribution, energy curve, duplicates, and synergies.
   *
   * @param analyzeDeckDto Payload with either an existing deck ID or an array of card IDs.
   * @returns Detailed deck analysis report with warnings and recommendations.
   */
  @Post("analyzeDeck")
  @Public()
  @ApiOperation({
    summary: "Analyze deck composition and synergy",
    description:
      "Evaluates card types, category curves, energy costs, and evolutionary/type synergies.",
  })
  @ApiResponse({
    status: 200,
    description: "Deck successfully analyzed",
    type: DeckAnalysisResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request payload or card IDs not found",
  })
  @ApiResponse({
    status: 404,
    description: "Specified deck not found",
  })
  analyzeDeck(
    @Body() analyzeDeckDto: AnalyzeDeckDto,
  ): Promise<DeckAnalysisResponseDto> {
    return this.aiService.analyzeDeck(analyzeDeckDto);
  }
}
