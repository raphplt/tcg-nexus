import { Controller, Get } from '@nestjs/common';
import { DeckFormatService } from './deck-format.service';
@Controller('deck-format')
export class DeckFormatController {
  constructor(private readonly deckFormatService: DeckFormatService) {}

  @Get()
  findAll() {
    return this.deckFormatService.findAll();
  }
}
