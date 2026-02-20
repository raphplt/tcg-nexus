import { Controller, Post, Query, Body } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TournamentType } from 'src/tournament/entities/tournament.entity';
import { SeedingMethod } from 'src/tournament/services/seeding.service';
import { UserRole } from 'src/common/enums/user';

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
    const faqs = await this.seedService.seedFaq();
    await this.seedService.importPokemon();
    await this.seedService.seedListings();
    await this.seedService.seedCardEvents();
    await this.seedService.seedCardPopularityMetrics();
    return { users, tournaments, faqs };
  }

  @Post('create-user')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['admin', 'user', 'moderator'] }
      }
    }
  })
  async createUser(
    @Body() body: { email: string; password: string; firstName: string; lastName: string; role?: UserRole }
  ) {
    const user = await this.seedService.createUser(
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.role || UserRole.USER
    );
    return { id: user.id, email: user.email, role: user.role };
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

  @Post('card-events')
  async seedCardEvents() {
    await this.seedService.seedCardEvents();
    return { message: 'Card events seeded successfully' };
  }

  @Post('card-popularity-metrics')
  async seedCardPopularityMetrics() {
    await this.seedService.seedCardPopularityMetrics();
    return { message: 'Card popularity metrics seeded successfully' };
  }
}
