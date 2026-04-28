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
import { DispatchTrainingActionDto } from "./dto/dispatch-training-action.dto";
import { RespondTrainingPromptDto } from "./dto/respond-training-prompt.dto";
import { SelectCasualDeckDto } from "./dto/select-casual-deck.dto";

@ApiTags("casual-matches")
@ApiBearerAuth()
@Controller("casual-matches")
export class CasualMatchController {
  constructor(private readonly casualMatchService: CasualMatchService) {}

  @Get("lobby")
  getLobby(@CurrentUser() user: User) {
    return this.casualMatchService.getLobby(user);
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
    return this.casualMatchService.dispatchAction(id, user, {
      ...body.action,
      playerId: "", // Will be overwritten by service
    });
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
