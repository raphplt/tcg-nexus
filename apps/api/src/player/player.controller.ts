import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('player')
@Controller(['player', 'players'])
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post()
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playerService.findOne(id);
  }

  @Get(':id/tournament-history')
  getTournamentHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('period') period?: string
  ) {
    return this.playerService.getTournamentHistory(id, period);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlayerDto: UpdatePlayerDto
  ) {
    return this.playerService.update(id, updatePlayerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.playerService.remove(id);
  }
}
