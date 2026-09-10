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
  Query,
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
  ApiQuery,
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
import { CreatePokemonSetDto } from "./dto/create-pokemon-set.dto";
import { UpdatePokemonSetDto } from "./dto/update-pokemon-set.dto";
import { PokemonSetService } from "./pokemon-set.service";

/**
 * Controller exposing endpoints to create, query, and manage Pokémon expansion sets and their assets.
 */
@ApiTags("pokemon-set")
@Controller("pokemon-set")
export class PokemonSetController {
  constructor(
    private readonly pokemonSetService: PokemonSetService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  /**
   * Creates a new Pokémon expansion set.
   *
   * @param createPokemonSetDto Set creation payload.
   * @returns Newly created Pokémon set.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new Pokémon expansion set" })
  create(@Body() createPokemonSetDto: CreatePokemonSetDto) {
    return this.pokemonSetService.create(createPokemonSetDto);
  }

  /**
   * Retrieves all Pokémon expansion sets sorted by release date.
   *
   * @param limit Optional maximum number of sets to return.
   * @returns Array of expansion sets.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Retrieve all Pokémon expansion sets" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(@Query("limit") limit?: number) {
    return this.pokemonSetService.findAll(limit);
  }

  /**
   * Retrieves a specific Pokémon expansion set by ID.
   *
   * @param id Set identifier.
   * @returns Expansion set entity.
   */
  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Retrieve expansion set by ID" })
  @ApiParam({ name: "id", description: "Expansion set identifier" })
  findOne(@Param("id") id: string) {
    return this.pokemonSetService.findOne(id);
  }

  /**
   * Updates an existing Pokémon expansion set.
   *
   * @param id Set identifier.
   * @param updatePokemonSetDto Updated set fields.
   * @returns Updated set entity.
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update Pokémon expansion set" })
  @ApiParam({ name: "id", description: "Expansion set identifier" })
  update(
    @Param("id") id: string,
    @Body() updatePokemonSetDto: UpdatePokemonSetDto,
  ) {
    return this.pokemonSetService.update(id, updatePokemonSetDto);
  }

  /**
   * Deletes a Pokémon expansion set.
   *
   * @param id Set identifier.
   * @returns Deletion confirmation.
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete Pokémon expansion set" })
  @ApiParam({ name: "id", description: "Expansion set identifier" })
  remove(@Param("id") id: string) {
    return this.pokemonSetService.remove(id);
  }

  /**
   * Uploads and updates the localized logo image for an expansion set.
   *
   * @param id Set identifier.
   * @param file Uploaded image file.
   * @param locale Target locale for the logo.
   * @returns Updated visual entity.
   */
  @Post(":id/logo")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload localized set logo image" })
  @ApiParam({ name: "id", description: "Expansion set identifier" })
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

    const set = await this.pokemonSetService.findOne(id);
    if (!set) {
      throw new NotFoundException(`Extension ${id} introuvable`);
    }

    // Logo image is localized: replace existing logo image for current locale.
    const visual = await this.pokemonSetService.findVisual(id, locale);
    if (visual?.logo) {
      await this.r2StorageService.deleteFile(visual.logo);
    }

    const extension = path.extname(file.originalname) || ".webp";
    // Storage key derived from set ID, stable across locales and namespaced by locale
    const key = `sets/${id}/${locale}/logo${extension}`;
    const logoUrl = await this.r2StorageService.uploadFile(
      file.buffer,
      key,
      file.mimetype || "image/webp",
    );

    if (!logoUrl) {
      throw new InternalServerErrorException("Échec de l'upload sur R2");
    }

    return this.pokemonSetService.updateVisual(id, locale, { logo: logoUrl });
  }

  /**
   * Uploads and updates the symbol image for an expansion set.
   *
   * @param id Set identifier.
   * @param file Uploaded symbol image file.
   * @param locale Target locale for the symbol.
   * @returns Updated visual entity.
   */
  @Post(":id/symbol")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload localized set symbol image" })
  @ApiParam({ name: "id", description: "Expansion set identifier" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  async uploadSymbol(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @RequestLocale() locale: SupportedLocale,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    const set = await this.pokemonSetService.findOne(id);
    if (!set) {
      throw new NotFoundException(`Extension ${id} introuvable`);
    }

    const visual = await this.pokemonSetService.findVisual(id, locale);
    if (visual?.symbol) {
      await this.r2StorageService.deleteFile(visual.symbol);
    }

    const extension = path.extname(file.originalname) || ".png";
    const key = `sets/${id}/${locale}/symbol${extension}`;
    const symbolUrl = await this.r2StorageService.uploadFile(
      file.buffer,
      key,
      file.mimetype || "image/png",
    );

    if (!symbolUrl) {
      throw new InternalServerErrorException("Échec de l'upload sur R2");
    }

    return this.pokemonSetService.updateVisual(id, locale, {
      symbol: symbolUrl,
    });
  }
}
