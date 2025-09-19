import { Controller, Post, Query, ParseIntPipe } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { TournamentType } from 'src/tournament/entities/tournament.entity';
import { SeedingMethod } from 'src/tournament/services/seeding.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('importSeries')
  importSeries() {
    return this.seedService.importPokemonSeries();
  }

  @Post('all')
  async seedAll() {
    const users = await this.seedService.seedUsers();
    const tournaments = await this.seedService.seedTournaments();
    await this.seedService.importPokemon();
    return { users, tournaments };
  }

  @Post('complete-tournament')
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'playerCount', required: false, type: Number })
  @ApiQuery({ name: 'tournamentType', required: false, enum: TournamentType })
  @ApiQuery({ name: 'seedingMethod', required: false, enum: SeedingMethod })
  async seedCompleteTournament(
    @Query('name') name?: string,
    @Query('playerCount') playerCount?: string,
    @Query('tournamentType') tournamentType?: TournamentType,
    @Query('seedingMethod') seedingMethod?: SeedingMethod
  ) {
    return this.seedService.seedCompleteTournament(
      name,
      playerCount ? parseInt(playerCount) : undefined,
      tournamentType,
      seedingMethod
    );
  }
}
