import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { ChallengeService } from "./challenge.service";

/**
 * Controller exposing active user quests and challenge reward claim endpoints.
 */
@ApiTags("challenges")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("challenges")
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  /**
   * Retrieves all currently active daily/weekly challenges and progress for the user.
   *
   * @param user Current authenticated user.
   * @returns Array of active challenges with progression counters.
   */
  @Get("active")
  @ApiOperation({
    summary: "Retrieve current user active challenges and progress",
  })
  async getActiveChallenges(@CurrentUser() user: User) {
    return this.challengeService.getActiveChallenges(user.id);
  }

  /**
   * Claims the rewards for a completed challenge.
   *
   * @param activeChallengeId Active challenge ID.
   * @param user Current authenticated user.
   * @returns Claim confirmation and reward details.
   */
  @Post(":id/claim")
  @ApiOperation({ summary: "Claim completed challenge reward" })
  @ApiParam({ name: "id", description: "Active challenge ID" })
  async claimChallengeReward(
    @Param("id") activeChallengeId: string,
    @CurrentUser() user: User,
  ) {
    return this.challengeService.claimChallenge(+activeChallengeId, user.id);
  }
}
