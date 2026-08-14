import { Body, Controller, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Roles } from "src/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { UserRole } from "src/common/enums/user";
import { SealedProductService } from "src/sealed-product/sealed-product.service";
import { TournamentType } from "src/tournament/entities/tournament.entity";
import { SeedingMethod } from "src/tournament/services/seeding.service";
import { SeedUserDto } from "./dto/seed-user.dto";
import { SeedService } from "./seed.service";

@ApiTags("seed")
@ApiBearerAuth()
@Controller("seed")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
    private readonly sealedProductService: SealedProductService,
  ) {}

  /** Importe séries, sets, cartes et traductions depuis le dataset local. */
  @Post("importCatalog")
  importCatalog() {
    return this.seedService.importPokemon();
  }

  @Post("all")
  async seedAll() {
    await this.seedService.enableExtensions();
    const users = await this.seedService.seedUsers();
    const tournaments = await this.seedService.seedTournaments();
    const faqs = await this.seedService.seedFaq();
    await this.seedService.importPokemon();
    await this.seedService.seedListings();
    await this.seedService.seedCardEvents();
    await this.seedService.seedCardPopularityMetrics();
    const sealedReport = await this.sealedProductService
      .seedFromJson()
      .catch((err) => ({ error: err.message }));
    return { users, tournaments, faqs, sealedReport };
  }

  @Post("create-user")
  async createUser(@Body() body: SeedUserDto) {
    const user = await this.seedService.createUser(
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.role || UserRole.USER,
    );
    return { id: user.id, email: user.email, role: user.role };
  }

  @Post("complete-tournament")
  @ApiQuery({ name: "name", required: false, type: String })
  @ApiQuery({ name: "playerCount", required: false, type: Number })
  @ApiQuery({ name: "tournamentType", required: false, enum: TournamentType })
  @ApiQuery({ name: "seedingMethod", required: false, enum: SeedingMethod })
  async seedCompleteTournament(
    @Query("name") name?: string,
    @Query("playerCount") playerCount?: string,
    @Query("tournamentType") tournamentType?: TournamentType,
    @Query("seedingMethod") seedingMethod?: SeedingMethod,
  ) {
    return this.seedService.seedCompleteTournament(
      name,
      playerCount ? parseInt(playerCount) : undefined,
      tournamentType,
      seedingMethod,
    );
  }

  @Post("card-events")
  async seedCardEvents() {
    await this.seedService.seedCardEvents();
    return { message: "Card events seeded successfully" };
  }

  @Post("card-popularity-metrics")
  async seedCardPopularityMetrics() {
    await this.seedService.seedCardPopularityMetrics();
    return { message: "Card popularity metrics seeded successfully" };
  }
}
