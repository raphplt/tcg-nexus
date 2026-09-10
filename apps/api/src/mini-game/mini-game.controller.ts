import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { JustePrixItemsQueryDto } from "./dto/juste-prix-items-query.dto";
import { MiniGameItemsService } from "./mini-game-items.service";
import {
  JUSTE_PRIX_MAX_ACCURACY_POINTS,
  JUSTE_PRIX_MAX_SPEED_BONUS,
  JUSTE_PRIX_ROUND_SECONDS,
} from "./mini-game-pricing";

/**
 * REST surface of the mini-games, used by the solo and local modes that do
 * not need a WebSocket session. Online duels live in {@link MiniGameGateway}.
 */
@ApiTags("Mini-games")
@Controller("mini-game")
export class MiniGameController {
  constructor(private readonly items: MiniGameItemsService) {}

  /**
   * Items for a solo or local Juste Prix game, with their reference price.
   *
   * The same draw as the online mode: Pokémon cards with a real market value
   * and sealed products priced by their active listings. Labels are localized
   * by the catalog interceptor in the request language.
   */
  @Public()
  @Get("juste-prix/items")
  @ApiOperation({
    summary: "Draw priced items for a solo or local Juste Prix game",
  })
  @ApiOkResponse({
    description:
      "Shuffled items, each with `type` (card | sealed), `id`, `price` in euros and the localized `data` entity.",
  })
  @ApiServiceUnavailableResponse({
    description: "The catalog does not hold enough priced items.",
  })
  async getJustePrixItems(@Query() query: JustePrixItemsQueryDto) {
    const items = await this.items.buildJustePrixItems(
      query.count ?? 5,
      query.setId,
    );
    return {
      rules: {
        roundSeconds: JUSTE_PRIX_ROUND_SECONDS,
        maxAccuracyPoints: JUSTE_PRIX_MAX_ACCURACY_POINTS,
        maxSpeedBonus: JUSTE_PRIX_MAX_SPEED_BONUS,
      },
      items,
    };
  }
}
