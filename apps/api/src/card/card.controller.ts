import { Controller, Get, Param, Query } from '@nestjs/common';
import { CardService } from './card.service';
import { CardGame } from '../common/enums/cardGame';
import { ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('cards')
@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  @ApiQuery({ name: 'game', required: false, enum: CardGame })
  findAll(@Query('game') game?: CardGame) {
    return this.cardService.findAll(game);
  }

  @Get('paginated')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'game', required: false, enum: CardGame })
  findAllPaginated(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('game') game?: CardGame
  ) {
    return this.cardService.findAllPaginated(page, limit, game);
  }

  @Get('search/:search')
  @ApiQuery({ name: 'game', required: false, enum: CardGame })
  findBySearch(@Param('search') search: string, @Query('game') game?: CardGame) {
    return this.cardService.findBySearch(search, game);
  }

  @Get('random')
  @ApiQuery({ name: 'game', required: false, enum: CardGame })
  findRandom(@Query('game') game?: CardGame) {
    return this.cardService.findRandom(game);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id);
  }
}
