import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";
import { CasualMatchService } from "./casual/casual-match.service";
import { CasualLobbyView } from "./casual/casual-match.types";
import { MatchmakingService } from "./casual/matchmaking.service";
import { DispatchTrainingActionDto } from "./dto/dispatch-training-action.dto";
import { RespondTrainingPromptDto } from "./dto/respond-training-prompt.dto";
import { SelectCasualDeckDto } from "./dto/select-casual-deck.dto";
import { PlayerAction } from "./engine/actions/Action";

/**
 * Controller managing casual peer-to-peer and matchmaking game sessions.
 */
@ApiTags("casual-matches")
@ApiBearerAuth()
@Controller("casual-matches")
export class CasualMatchController {
  constructor(
    private readonly casualMatchService: CasualMatchService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  /**
   * Returns the casual lobby: eligible decks, ongoing sessions and live matchmaking state.
   *
   * @param user - Current authenticated user.
   * @returns Casual lobby overview and queue status.
   */
  @ApiOperation({
    summary:
      "Get casual lobby overview (eligible decks, ongoing games, queue status)",
  })
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

  /**
   * Retrieves player-specific game state perspective for an ongoing casual session.
   *
   * @param id - Casual session identifier.
   * @param user - Current authenticated player.
   * @returns Perspective game state with private hand and board visibility.
   */
  @ApiOperation({
    summary: "Get player-specific perspective of an active casual match",
  })
  @Get(":id")
  getSessionView(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.casualMatchService.getSessionView(id, user);
  }

  /**
   * Selects an eligible deck for the player's slot in the casual session.
   *
   * @param id - Casual session identifier.
   * @param user - Current authenticated player.
   * @param body - Selected deck payload.
   * @returns Updated casual match session.
   */
  @ApiOperation({ summary: "Select deck for an active casual match session" })
  @Post(":id/deck")
  selectDeck(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: SelectCasualDeckDto,
  ) {
    return this.casualMatchService.selectDeck(id, user, body.deckId);
  }

  /**
   * Dispatches a gameplay action to the live match rules engine.
   *
   * @param id - Casual session identifier.
   * @param user - Current authenticated player.
   * @param body - Player gameplay action payload.
   * @returns State update resulting from the executed action.
   */
  @ApiOperation({
    summary: "Dispatch gameplay action to casual match engine",
  })
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

  /**
   * Responds to an interactive game engine decision prompt (choice, target selection).
   *
   * @param id - Casual session identifier.
   * @param user - Current authenticated player.
   * @param body - Decision response payload.
   * @returns Updated game state after prompt resolution.
   */
  @ApiOperation({
    summary: "Respond to an interactive gameplay decision prompt",
  })
  @Post(":id/prompt")
  respondPrompt(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: RespondTrainingPromptDto,
  ) {
    return this.casualMatchService.respondPrompt(id, user, body.response);
  }
}
