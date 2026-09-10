import { Controller, Get, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { FeedService } from "./feed.service";

/**
 * Controller exposing personalized activity feed endpoints for authenticated users.
 */
@ApiTags("feed")
@Controller("feed")
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Retrieves the personalized activity feed for the current user based on followed creators and marketplace events.
   *
   * @param user Current authenticated user.
   * @param limit Maximum number of feed items to retrieve (default: 30).
   * @returns Array of chronological feed activities.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retrieve personalized user activity feed" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    example: 30,
    description: "Maximum number of feed entries to return",
  })
  getFeed(
    @CurrentUser() user: User,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.feedService.getFeedForUser(user.id, limit ?? 30);
  }
}
