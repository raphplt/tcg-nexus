import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { DeckCardService } from "./deck-card.service";
import { CreateDeckCardDto } from "./dto/create-deck-card.dto";
import { UpdateDeckCardDto } from "./dto/update-deck-card.dto";

/**
 * Controller managing deck-card associations.
 */
@ApiTags("deck-card")
@Controller("deck-card")
export class DeckCardController {
  constructor(private readonly deckCardService: DeckCardService) {}

  /**
   * Creates a new deck-card link.
   *
   * @param createDeckCardDto Association payload.
   * @returns Newly created deck card entity.
   */
  @Post()
  @ApiOperation({ summary: "Add a card to a deck" })
  create(@Body() createDeckCardDto: CreateDeckCardDto) {
    return this.deckCardService.create(createDeckCardDto);
  }

  /**
   * Retrieves all deck card entries.
   *
   * @returns Array of deck card entities.
   */
  @Get()
  @ApiOperation({ summary: "Retrieve all deck card entries" })
  findAll() {
    return this.deckCardService.findAll();
  }

  /**
   * Retrieves a deck card entry by ID.
   *
   * @param id Association unique identifier.
   * @returns Deck card entity.
   */
  @Get(":id")
  @ApiOperation({ summary: "Retrieve a deck card entry by ID" })
  @ApiParam({ name: "id", description: "Deck card ID" })
  findOne(@Param("id") id: string) {
    return this.deckCardService.findOne(+id);
  }

  /**
   * Updates an existing deck card entry.
   *
   * @param id Association unique identifier.
   * @param updateDeckCardDto Update payload.
   * @returns Updated deck card entity.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update a deck card entry" })
  @ApiParam({ name: "id", description: "Deck card ID" })
  update(
    @Param("id") id: string,
    @Body() updateDeckCardDto: UpdateDeckCardDto,
  ) {
    return this.deckCardService.update(+id, updateDeckCardDto);
  }

  /**
   * Removes a deck card entry by ID.
   *
   * @param id Association unique identifier.
   * @returns Deletion outcome.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Remove a card from a deck by association ID" })
  @ApiParam({ name: "id", description: "Deck card ID" })
  remove(@Param("id") id: string) {
    return this.deckCardService.remove(+id);
  }
}
