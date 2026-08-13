import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { UserRole } from "src/common/enums/user";
import { UpsertTranslationsDto } from "./dto/upsert-translations.dto";
import { TranslationService } from "./translation.service";

@ApiTags("translations")
@Controller("translations")
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  // lu par le web à chaque rafraîchissement de son cache de messages
  @Get()
  @Public()
  findAll(@Query("locale") locale?: string) {
    return this.translationService.findAllGrouped(locale);
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async upsert(@Body() dto: UpsertTranslationsDto) {
    const saved = await this.translationService.upsertMany(dto.entries);
    return { saved };
  }
}
