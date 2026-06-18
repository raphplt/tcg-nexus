import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { CardGame } from "../common/enums/cardGame";
import { CardService } from "./card.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("cards")
@Controller("cards")
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Public()
  @Get()
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findAll(@Query("game") game?: CardGame) {
    return this.cardService.findAll(game);
  }

  @Public()
  @Get("paginated")
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findAllPaginated(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("game") game?: CardGame,
  ) {
    return this.cardService.findAllPaginated(page, limit, game);
  }

  @Public()
  @Get("search/:search")
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findBySearch(
    @Param("search") search: string,
    @Query("game") game?: CardGame,
  ) {
    return this.cardService.findBySearch(search, game);
  }

  @Public()
  @Get("random")
  @ApiQuery({ name: "game", required: false, enum: CardGame })
  findRandom(@Query("game") game?: CardGame) {
    return this.cardService.findRandom(game);
  }

  @Public()
  @Get("set/:setId/rarities")
  getSetRarities(@Param("setId") setId: string) {
    return this.cardService.getSetRarities(setId);
  }

  @Public()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.cardService.findOne(id);
  }
}
