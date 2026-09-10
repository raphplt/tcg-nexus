import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import * as path from "path";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { R2StorageService } from "../common/r2-storage.service";
import { RequestLocale } from "../translation/request-locale";
import type { SupportedLocale } from "../translation/supported-locales";
import { CreatePokemonSeryDto } from "./dto/create-pokemon-sery.dto";
import { UpdatePokemonSeryDto } from "./dto/update-pokemon-sery.dto";
import { PokemonSeriesService } from "./pokemon-series.service";

/**
 * Controller exposing endpoints for creating, querying, and updating Pokémon card series and logos.
 */
@ApiTags("pokemon-series")
@Controller("pokemon-series")
export class PokemonSeriesController {
  constructor(
    private readonly pokemonSeriesService: PokemonSeriesService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  /**
   * Creates a new Pokémon series.
   *
   * @param createPokemonSeryDto Series creation payload.
   * @returns Newly created Pokémon series.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new Pokémon series" })
  create(@Body() createPokemonSeryDto: CreatePokemonSeryDto) {
    return this.pokemonSeriesService.create(createPokemonSeryDto);
  }

  /**
   * Retrieves all Pokémon series.
   *
   * @returns Array of series entities.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Retrieve all Pokémon series" })
  findAll() {
    return this.pokemonSeriesService.findAll();
  }

  /**
   * Retrieves a specific Pokémon series by ID.
   *
   * @param id Series identifier.
   * @returns Series entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve Pokémon series by ID" })
  @ApiParam({ name: "id", description: "Series identifier" })
  findOne(@Param("id") id: string) {
    return this.pokemonSeriesService.findOne(id);
  }

  /**
   * Updates an existing Pokémon series.
   *
   * @param id Series identifier.
   * @param updatePokemonSeryDto Updated series fields.
   * @returns Updated series entity.
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update Pokémon series" })
  @ApiParam({ name: "id", description: "Series identifier" })
  update(
    @Param("id") id: string,
    @Body() updatePokemonSeryDto: UpdatePokemonSeryDto,
  ) {
    return this.pokemonSeriesService.update(id, updatePokemonSeryDto);
  }

  /**
   * Removes a Pokémon series.
   *
   * @param id Series identifier.
   * @returns Deletion confirmation.
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete Pokémon series" })
  @ApiParam({ name: "id", description: "Series identifier" })
  remove(@Param("id") id: string) {
    return this.pokemonSeriesService.remove(id);
  }

  /**
   * Uploads and updates the localized logo image for a Pokémon series.
   *
   * @param id Series identifier.
   * @param file Uploaded image file.
   * @param locale Target locale for the logo.
   * @returns Updated visual entity.
   */
  @Post(":id/logo")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload localized series logo image" })
  @ApiParam({ name: "id", description: "Series identifier" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
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
