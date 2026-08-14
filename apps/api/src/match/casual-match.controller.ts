import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";
import { CasualMatchService } from "./casual/casual-match.service";
import { CasualLobbyView } from "./casual/casual-match.types";
import { MatchmakingService } from "./casual/matchmaking.service";
import { DispatchTrainingActionDto } from "./dto/dispatch-training-action.dto";
import { RespondTrainingPromptDto } from "./dto/respond-training-prompt.dto";
import { SelectCasualDeckDto } from "./dto/select-casual-deck.dto";
import { PlayerAction } from "./engine/actions/Action";

@ApiTags("casual-matches")
@ApiBearerAuth()
@Controller("casual-matches")
export class CasualMatchController {
  constructor(
    private readonly casualMatchService: CasualMatchService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  /**
   * Returns the casual lobby: eligible decks, ongoing sessions and the live
   * matchmaking state of the requesting user.
   */
  @Get("lobby")
  async getLobby(@CurrentUser() user: User): Promise<CasualLobbyView> {
    const lobby = await this.casualMatchService.getLobby(user);

    return {
      ...lobby,
      queueStatus: this.matchmakingService.isQueued(user.id)
        ? "queued"
        : "idle",
    };
  }

  @Get(":id")
  getSessionView(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.casualMatchService.getSessionView(id, user);
  }

  @Post(":id/deck")
  selectDeck(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: SelectCasualDeckDto,
  ) {
    return this.casualMatchService.selectDeck(id, user, body.deckId);
  }

  @Post(":id/action")
  dispatchAction(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: DispatchTrainingActionDto,
  ) {
    // The engine player id is resolved from the authenticated slot by the
    // service, so the payload never carries one.
    return this.casualMatchService.dispatchAction(
      id,
      user,
      body.action as unknown as PlayerAction,
    );
  }

  @Post(":id/prompt")
  respondPrompt(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: RespondTrainingPromptDto,
  ) {
    return this.casualMatchService.respondPrompt(id, user, body.response);
  }
}
