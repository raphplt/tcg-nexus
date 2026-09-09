import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums/user";
import { CardStateService } from "./card-state.service";
import { CreateCardStateDto } from "./dto/create-card-state.dto";
import { UpdateCardStateDto } from "./dto/update-card-state.dto";
import { CardState } from "./entities/card-state.entity";

/**
 * Controller exposing endpoints for querying and managing card condition reference data.
 */
@ApiTags("card-state")
@Controller("card-state")
export class CardStateController {
  constructor(private readonly cardStateService: CardStateService) {}

  /**
   * Creates a new card condition state. Restricted to administrators.
   *
   * @param createCardStateDto Creation payload.
   * @returns Newly created card state.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new card condition state (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Card state created successfully",
    type: CardState,
  })
  @ApiResponse({ status: 400, description: "Invalid payload parameters" })
  @ApiResponse({ status: 403, description: "Insufficient privileges" })
  create(@Body() createCardStateDto: CreateCardStateDto): Promise<CardState> {
    return this.cardStateService.create(createCardStateDto);
  }

  /**
   * Retrieves all card condition grading states.
   *
   * @returns List of all card states.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "List all card condition states" })
  @ApiResponse({
    status: 200,
    description: "List of all card states",
    type: [CardState],
  })
  findAll(): Promise<CardState[]> {
    return this.cardStateService.findAll();
  }

  /**
   * Retrieves a specific card condition state by numeric ID.
   *
   * @param id Primary key identifier.
   * @returns Found card state.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a card condition state by ID" })
  @ApiResponse({
    status: 200,
    description: "Card state found",
    type: CardState,
  })
  @ApiResponse({ status: 404, description: "Card state not found" })
  findOne(@Param("id", ParseIntPipe) id: number): Promise<CardState> {
    return this.cardStateService.findOne(id);
  }

  /**
   * Updates an existing card condition state. Restricted to administrators.
   *
   * @param id Identifier of the card state.
   * @param updateCardStateDto Updated properties.
   * @returns Updated card state entity.
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a card condition state (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Card state updated successfully",
    type: CardState,
  })
  @ApiResponse({ status: 400, description: "Invalid payload parameters" })
  @ApiResponse({ status: 403, description: "Insufficient privileges" })
  @ApiResponse({ status: 404, description: "Card state not found" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCardStateDto: UpdateCardStateDto,
  ): Promise<CardState> {
    return this.cardStateService.update(id, updateCardStateDto);
  }

  /**
   * Deletes a card condition state. Restricted to administrators.
   *
   * @param id Identifier of the card state to remove.
   */
  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a card condition state (Admin only)" })
  @ApiResponse({ status: 200, description: "Card state deleted successfully" })
  @ApiResponse({ status: 403, description: "Insufficient privileges" })
  @ApiResponse({ status: 404, description: "Card state not found" })
  remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.cardStateService.remove(id);
  }
}
