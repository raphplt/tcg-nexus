import { Controller, Get, Param } from '@nestjs/common';
import { TcgDexService } from './tcg-dex.service';

@Controller('tcgdex')
export class TcgDexController {
  constructor(private readonly tcgDexService: TcgDexService) {}

  @Get('cards/:id')
  async getCard(@Param('id') id: string) {
    return this.tcgDexService.getCardById(id);
  }

  @Get('series/:id')
  async getSeries(@Param('id') id: string) {
    return this.tcgDexService.getSeriesById(id);
  }

  @Get('sets/:id')
  async getSets(@Param('id') id: string) {
    return this.tcgDexService.getSetById(id);
  }

  @Get('setCard/:id')
  async getSetCard(@Param('id') id: string) {
    return this.tcgDexService.getSetWithCards(id);
  }

  // TODO : faire en sorte que ca marche car tres pratique
  // on utilisera une routes qui fait serie par serie pour l'instant
  @Get('bloc/:id')
  async getBloc(@Param('id') id: string) {
    return this.tcgDexService.getBloc(id);
  }
}
