import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { UpsertTranslationsDto } from "./dto/upsert-translations.dto";
import { TranslationService } from "./translation.service";

/**
 * Controller exposing endpoints for retrieving and administering UI and catalog localization strings.
 */
@ApiTags("translations")
@Controller("translations")
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  /**
   * Retrieves all translation key-value pairs grouped by locale or filtered by a specific locale.
   *
   * @param locale Optional locale filter (e.g. "en", "fr").
   * @returns Grouped dictionary of translation keys and strings.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Retrieve translations grouped by locale" })
  @ApiQuery({ name: "locale", required: false, type: String, example: "en" })
  findAll(@Query("locale") locale?: string) {
    return this.translationService.findAllGrouped(locale);
  }

  /**
   * Upserts multiple translation entries in batch.
   *
   * @param dto Batch of translation entries to upsert.
   * @returns Object containing the count of saved entries.
   */
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Batch upsert translations (Admin)" })
  async upsert(@Body() dto: UpsertTranslationsDto) {
    const saved = await this.translationService.upsertMany(dto.entries);
    return { saved };
  }
}
