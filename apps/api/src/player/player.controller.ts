import { Controller, Get, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PlayerService } from './player.service';
// import { CreatePlayerDto } from './dto/create-player.dto';
// import { UpdatePlayerDto } from './dto/update-player.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('player')
@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  // @Post()
  // create(@Body() createPlayerDto: CreatePlayerDto) {
  //   return this.playerService.create(createPlayerDto);
  // }

  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playerService.findOne(+id);
  }

  @Get(':id/tournaments')
  getTournamentsForPlayer(@Param('id', ParseIntPipe) id: number) {
    return this.playerService.getTournamentsByPlayerId(id);
  }

  // user -> player -> tournaments
  @Get('/user/:userId/tournaments')
  getTournamentsForUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.playerService.getTournamentsByUserId(userId);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerDto) {
  //   return this.playerService.update(+id, updatePlayerDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playerService.remove(+id);
  }
}
