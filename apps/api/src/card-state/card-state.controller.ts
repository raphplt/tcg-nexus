import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CardStateService } from './card-state.service';
import { CreateCardStateDto } from './dto/create-card-state.dto';
import { UpdateCardStateDto } from './dto/update-card-state.dto';

@Controller('card-state')
export class CardStateController {
  constructor(private readonly cardStateService: CardStateService) {}

  @Post()
  create(@Body() createCardStateDto: CreateCardStateDto) {
    return this.cardStateService.create(createCardStateDto);
  }

  @Get()
  findAll() {
    return this.cardStateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardStateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardStateDto: UpdateCardStateDto) {
    return this.cardStateService.update(+id, updateCardStateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardStateService.remove(+id);
  }
}
