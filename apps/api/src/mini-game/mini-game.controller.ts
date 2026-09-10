import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PACK_COMPOSITIONS } from "./booster";
import { CaseOpeningPacksQueryDto } from "./dto/case-opening-packs-query.dto";
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

  /**
   * Boosters for a solo or local Case Opening duel, drawn by rarity slot
   * from a set, a series or the whole catalog. Cards keep their pricing: the
   * client values each pack as it opens it.
   */
  @Public()
  @Get("case-opening/packs")
  @ApiOperation({
    summary: "Draw the boosters of a solo or local Case Opening duel",
  })
  @ApiOkResponse({
    description:
      "`packs[round][player]` arrays of localized cards with pricing, plus the slot composition of the chosen style.",
  })
  @ApiServiceUnavailableResponse({
    description: "The scope holds no priced Pokémon card.",
  })
  async getCaseOpeningPacks(@Query() query: CaseOpeningPacksQueryDto) {
    const style = query.style ?? "standard";
    const packs = await this.items.buildCaseOpeningPacks(
      query.count ?? 3,
      query.players ?? 2,
      { setId: query.setId, serieId: query.serieId, style },
    );
    return {
      style,
      composition: PACK_COMPOSITIONS[style],
      packs,
    };
  }
}
