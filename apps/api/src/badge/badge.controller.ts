import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { BadgeService } from "./badge.service";

@ApiTags("badges")
@Controller("badges")
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Public()
  @Get("user/:userId")
  getUserBadges(@Param("userId", ParseIntPipe) userId: number) {
    return this.badgeService.getUserBadges(userId);
  }
}
