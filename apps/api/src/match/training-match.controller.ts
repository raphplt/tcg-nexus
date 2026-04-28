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
import { CreateTrainingMatchDto } from "./dto/create-training-match.dto";
import { DispatchTrainingActionDto } from "./dto/dispatch-training-action.dto";
import { RespondTrainingPromptDto } from "./dto/respond-training-prompt.dto";
import { TrainingMatchService } from "./training/training-match.service";

@ApiTags("training-matches")
@ApiBearerAuth()
@Controller("training-matches")
export class TrainingMatchController {
  constructor(private readonly trainingMatchService: TrainingMatchService) {}

  @Get("lobby")
  getLobby(@CurrentUser() user: User) {
    return this.trainingMatchService.getLobby(user);
  }

  @Post()
  createSession(
    @CurrentUser() user: User,
    @Body() body: CreateTrainingMatchDto,
  ) {
    return this.trainingMatchService.createSession(user, body);
  }

  @Get(":id")
  getSessionView(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.trainingMatchService.getSessionView(id, user);
  }

  @Post(":id/action")
  dispatchAction(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: DispatchTrainingActionDto,
  ) {
    return this.trainingMatchService.dispatchAction(id, user, body.action);
  }

  @Post(":id/prompt")
  respondPrompt(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() body: RespondTrainingPromptDto,
  ) {
    return this.trainingMatchService.respondPrompt(id, user, body.response);
  }
}
