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
import { CreateTrainingMatchDto } from "./dto/create-training-match.dto";
import { DispatchTrainingActionDto } from "./dto/dispatch-training-action.dto";
import { RespondTrainingPromptDto } from "./dto/respond-training-prompt.dto";
import { TrainingMatchService } from "./training/training-match.service";

/**
 * Controller managing AI training and solo sandbox game sessions.
 */
@ApiTags("training-matches")
@ApiBearerAuth()
@Controller("training-matches")
export class TrainingMatchController {
  constructor(private readonly trainingMatchService: TrainingMatchService) {}

  /**
   * Retrieves player's training lobby overview with active solo sessions.
   *
   * @param user - Current authenticated user.
   * @returns Training lobby status.
   */
  @ApiOperation({
    summary: "Get player's training lobby with active solo practice sessions",
  })
  @Get("lobby")
  getLobby(@CurrentUser() user: User) {
    return this.trainingMatchService.getLobby(user);
  }

  /**
   * Creates a new training session with chosen player and AI bot decks.
   *
   * @param user - Current authenticated user.
   * @param body - Training match creation options.
   * @returns Newly initialized training session.
   */
  @ApiOperation({ summary: "Create a new solo training session against AI" })
  @Post()
  createSession(
    @CurrentUser() user: User,
    @Body() body: CreateTrainingMatchDto,
  ) {
    return this.trainingMatchService.createSession(user, body);
  }

  /**
   * Retrieves player perspective of the active training game state.
   *
   * @param id - Training session identifier.
   * @param user - Current authenticated user.
   * @returns Training session perspective view.
   */
  @ApiOperation({
    summary: "Get player perspective of an active training match",
  })
  @Get(":id")
  getSessionView(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.trainingMatchService.getSessionView(id, user);
  }

  /**
   * Dispatches a gameplay action to the training match engine.
   *
   * @param id - Training session identifier.
   * @param user - Current authenticated user.
   * @param body - Action payload.
   * @returns Updated game state after action resolution.
   */
  @ApiOperation({ summary: "Dispatch gameplay action in training match" })
  @Post(":id/action")
  dispatchAction(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: DispatchTrainingActionDto,
  ) {
    return this.trainingMatchService.dispatchAction(id, user, body.action);
  }

  /**
   * Responds to an interactive decision prompt in a training match.
   *
   * @param id - Training session identifier.
   * @param user - Current authenticated user.
   * @param body - Prompt response payload.
   * @returns Updated game state.
   */
  @ApiOperation({ summary: "Respond to decision prompt in training match" })
  @Post(":id/prompt")
  respondPrompt(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: RespondTrainingPromptDto,
  ) {
    return this.trainingMatchService.respondPrompt(id, user, body.response);
  }
}
