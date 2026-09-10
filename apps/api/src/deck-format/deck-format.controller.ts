import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DeckFormatService } from "./deck-format.service";

/**
 * Controller exposing available deck formats (e.g. Standard, Expanded, GLC).
 */
@ApiTags("deck-format")
@Controller("deck-format")
export class DeckFormatController {
  constructor(private readonly deckFormatService: DeckFormatService) {}

  /**
   * Retrieves all supported deck game formats.
   *
   * @returns Array of deck format entities.
   */
  @Get()
  @ApiOperation({ summary: "Retrieve all supported deck formats" })
  findAll() {
    return this.deckFormatService.findAll();
  }
}
