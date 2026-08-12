import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { RequestLocale } from "src/translation/request-locale";
import type { SupportedLocale } from "src/translation/supported-locales";
import { CreatePokemonSeryDto } from "./dto/create-pokemon-sery.dto";
import { UpdatePokemonSeryDto } from "./dto/update-pokemon-sery.dto";
import { PokemonSeriesService } from "./pokemon-series.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { UserRole } from "src/common/enums/user";
import { R2StorageService } from "../common/r2-storage.service";
import * as path from "path";

@ApiTags("pokemon-series")
@Controller("pokemon-series")
export class PokemonSeriesController {
  constructor(
    private readonly pokemonSeriesService: PokemonSeriesService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  @Post()
  create(@Body() createPokemonSeryDto: CreatePokemonSeryDto) {
    return this.pokemonSeriesService.create(createPokemonSeryDto);
  }

  @Get()
  @Public()
  findAll() {
    return this.pokemonSeriesService.findAll();
  }

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.pokemonSeriesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updatePokemonSeryDto: UpdatePokemonSeryDto,
  ) {
    return this.pokemonSeriesService.update(id, updatePokemonSeryDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.pokemonSeriesService.remove(id);
  }

  @Post(":id/logo")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FileInterceptor("file"))
  async uploadLogo(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @RequestLocale() locale: SupportedLocale,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    const serie = await this.pokemonSeriesService.findOne(id);
    if (!serie) {
      throw new NotFoundException(`Série ${id} introuvable`);
    }

    // Logo image is localized: replace existing logo image for current locale.
    const visual = await this.pokemonSeriesService.findVisual(id, locale);
    if (visual?.logo) {
      await this.r2StorageService.deleteFile(visual.logo);
    }

    const extension = path.extname(file.originalname) || ".webp";
    // Storage key derived from series ID, stable across locales and namespaced by locale
    const key = `series/${id}/${locale}/logo${extension}`;
    const logoUrl = await this.r2StorageService.uploadFile(
      file.buffer,
      key,
      file.mimetype || "image/webp",
    );

    if (!logoUrl) {
      throw new InternalServerErrorException("Échec de l'upload sur R2");
    }

    return this.pokemonSeriesService.updateVisual(id, locale, {
      logo: logoUrl,
    });
  }
}
