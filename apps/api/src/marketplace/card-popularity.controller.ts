import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { User } from "../user/entities/user.entity";
import { CardPopularityService } from "./card-popularity.service";
import {
  CreateCardEventDto,
  GetPopularCardsQueryDto,
  GetTrendingCardsQueryDto,
} from "./dto/card-popularity.dto";

/**
 * Controller handling card popularity and interaction event telemetry.
 */
@ApiTags("marketplace")
@Controller("marketplace")
export class CardPopularityController {
  constructor(private readonly cardPopularityService: CardPopularityService) {}

  /**
   * Records a user engagement event on a card (view, search click, bookmark).
   *
   * @param dto - Card event details payload.
   * @param user - Current authenticated user if logged in.
   * @param ipAddress - Client IP address for telemetry and deduplication.
   * @param req - Express request object.
   * @returns Telemetry recording result.
   */
  @Post("events")
  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "Record a card interaction event" })
  @ApiResponse({ status: 201, description: "Card event successfully recorded" })
  @ApiResponse({ status: 400, description: "Invalid event payload" })
  async recordEvent(
    @Body() dto: CreateCardEventDto,
    @CurrentUser() user?: User,
    @Ip() ipAddress?: string,
    @Req() req?: any,
  ) {
    await this.cardPopularityService.recordEvent(
      dto,
      user?.id,
      ipAddress,
      req?.headers?.["user-agent"] as string | undefined,
      dto.sessionId,
    );

    return { success: true };
  }

  /**
   * Retrieves cards with the highest overall popularity score.
   *
   * @param query - Query filter specifying maximum results.
   * @returns Array of popular card metrics.
   */
  @Get("popular")
  @Public()
  @ApiOperation({ summary: "Retrieve top popular cards" })
  async getPopularCards(@Query() query: GetPopularCardsQueryDto) {
    return this.cardPopularityService.getPopularCards(query.limit || 10);
  }

  /**
   * Retrieves trending cards displaying recent surges in views and interest.
   *
   * @param query - Trending filter options.
   * @returns Array of trending card metrics.
   */
  @Get("trending")
  @Public()
  @ApiOperation({
    summary: "Retrieve trending cards with recent activity spikes",
  })
  async getTrendingCards(@Query() query: GetTrendingCardsQueryDto) {
    return this.cardPopularityService.getTrendingCards(
      query.limit || 10,
      query.excludePopular === true,
    );
  }
}
