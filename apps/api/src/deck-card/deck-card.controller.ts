import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeckCardService } from './deck-card.service';
import { CreateDeckCardDto } from './dto/create-deck-card.dto';
import { UpdateDeckCardDto } from './dto/update-deck-card.dto';

@Controller('deck-card')
export class DeckCardController {
  constructor(private readonly deckCardService: DeckCardService) {}

  @Post()
  create(@Body() createDeckCardDto: CreateDeckCardDto) {
    return this.deckCardService.create(createDeckCardDto);
  }

  @Get()
  findAll() {
    return this.deckCardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deckCardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeckCardDto: UpdateDeckCardDto) {
    return this.deckCardService.update(+id, updateDeckCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deckCardService.remove(+id);
  }
}
