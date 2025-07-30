import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiTags } from '@nestjs/swagger';

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
}
