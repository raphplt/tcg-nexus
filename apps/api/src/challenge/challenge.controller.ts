import { Controller, Get, Post, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ChallengeService } from "./challenge.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";

@Controller("challenges")
@UseGuards(JwtAuthGuard)
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Get("active")
  async getActiveChallenges(@CurrentUser() user: User) {
    return this.challengeService.getActiveChallenges(user.id);
  }

  @Post(":id/claim")
  async claimChallengeReward(
    @Param("id") activeChallengeId: string,
    @CurrentUser() user: User,
  ) {
    return this.challengeService.claimChallenge(+activeChallengeId, user.id);
  }
}
