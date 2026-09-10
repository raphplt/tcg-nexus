import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { BadgeService } from "./badge.service";

/**
 * Controller exposing user achievement badges endpoints.
 */
@ApiTags("badges")
@Controller("badges")
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  /**
   * Retrieves all badges unlocked by a specific user.
   *
   * @param userId Target user ID.
   * @returns Array of unlocked badge entities.
   */
  @Public()
  @Get("user/:userId")
  @ApiOperation({ summary: "Retrieve all achievement badges for a user" })
  @ApiParam({ name: "userId", description: "Target user ID" })
  getUserBadges(@Param("userId", ParseIntPipe) userId: number) {
    return this.badgeService.getUserBadges(userId);
  }
}
