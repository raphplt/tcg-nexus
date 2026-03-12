import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { UpsertOnlineSessionDto } from "./dto/upsert-online-session.dto";
import { MatchOnlineService } from "./online/match-online.service";

@ApiTags("match-online")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("matches/:id/online")
export class MatchOnlineController {
  constructor(private readonly matchOnlineService: MatchOnlineService) {}

  @Get("deck-eligibility")
  getDeckEligibility(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.matchOnlineService.getDeckEligibility(id, request.user as User);
  }

  @Get("session")
  getSessionView(@Param("id", ParseIntPipe) id: number, @Req() request: Request) {
    return this.matchOnlineService.getSessionView(id, request.user as User);
  }

  @Post("session")
  upsertSession(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: Request,
    @Body() body: UpsertOnlineSessionDto,
  ) {
    return this.matchOnlineService.upsertSession(
      id,
      request.user as User,
      body.deckId,
    );
  }
}
