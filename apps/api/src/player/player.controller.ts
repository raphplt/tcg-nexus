import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";
import { Player } from "./entities/player.entity";
import { PlayerService } from "./player.service";

/**
 * Controller managing competitive player profiles, statistics, and tournament history.
 */
@ApiTags("player")
@Controller("player")
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  /**
   * Creates a new player profile.
   *
   * @param createPlayerDto - Player profile details.
   * @returns Created player entity.
   */
  @Post()
  @ApiOperation({ summary: "Create a new player profile" })
  @ApiResponse({ status: 201, description: "Player successfully created.", type: Player })
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  /**
   * Retrieves all registered players.
   *
   * @returns List of all players.
   */
  @Get()
  @ApiOperation({ summary: "Retrieve all player profiles" })
  @ApiResponse({ status: 200, description: "List of player profiles.", type: [Player] })
  findAll() {
    return this.playerService.findAll();
  }

  /**
   * Retrieves tournament history and ELO progression for a player.
   *
   * @param id - Player unique identifier.
   * @param period - Optional time filter (e.g., '1m', '3m', '1y', 'all').
   * @returns Tournament history, statistics, and ELO evolution.
   */
  @Public()
  @Get(":id/tournament-history")
  @ApiOperation({ summary: "Retrieve tournament history and ELO trajectory for a player" })
  @ApiParam({ name: "id", description: "Player unique identifier", example: "1" })
  @ApiQuery({
    name: "period",
    required: false,
    description: "Period filter (1m, 3m, 1y, all)",
    example: "all",
  })
  @ApiResponse({ status: 200, description: "Player tournament history and statistics." })
  getTournamentHistory(
    @Param("id") id: string,
    @Query("period") period?: string,
  ) {
    return this.playerService.getTournamentHistory(+id, period);
  }

  /**
   * Retrieves a single player profile by ID.
   *
   * @param id - Player unique identifier.
   * @returns Player profile entity.
   */
  @Get(":id")
  @ApiOperation({ summary: "Retrieve a player profile by ID" })
  @ApiParam({ name: "id", description: "Player unique identifier", example: "1" })
  @ApiResponse({ status: 200, description: "Matching player profile.", type: Player })
  findOne(@Param("id") id: string) {
    return this.playerService.findOne(+id);
  }

  /**
   * Updates an existing player profile.
   *
   * @param id - Player unique identifier.
   * @param updatePlayerDto - Fields to update.
   * @returns Updated player entity.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update a player profile by ID" })
  @ApiParam({ name: "id", description: "Player unique identifier", example: "1" })
  @ApiResponse({ status: 200, description: "Updated player profile.", type: Player })
  update(@Param("id") id: string, @Body() updatePlayerDto: UpdatePlayerDto) {
    return this.playerService.update(+id, updatePlayerDto);
  }

  /**
   * Deletes a player profile.
   *
   * @param id - Player unique identifier.
   * @returns Deletion outcome.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete a player profile by ID" })
  @ApiParam({ name: "id", description: "Player unique identifier", example: "1" })
  @ApiResponse({ status: 200, description: "Player profile successfully deleted." })
  remove(@Param("id") id: string) {
    return this.playerService.remove(+id);
  }
}

