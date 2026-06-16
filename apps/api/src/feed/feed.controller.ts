import { Controller, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";
import { FeedService } from "./feed.service";

@ApiTags("feed")
@Controller("feed")
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiBearerAuth()
  getFeed(
    @CurrentUser() user: User,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.feedService.getFeedForUser(user.id, limit ?? 30);
  }
}
