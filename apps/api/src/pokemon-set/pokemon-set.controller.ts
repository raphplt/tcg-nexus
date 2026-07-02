import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";
import { CreatePokemonSetDto } from "./dto/create-pokemon-set.dto";
import { UpdatePokemonSetDto } from "./dto/update-pokemon-set.dto";
import { PokemonSetService } from "./pokemon-set.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "src/auth/decorators/roles.decorator";
import { RolesGuard } from "src/auth/guards/roles.guard";
import { UserRole } from "src/common/enums/user";
import { R2StorageService } from "../common/r2-storage.service";
import * as path from "path";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

@ApiTags("pokemon-set")
@Controller("pokemon-set")
export class PokemonSetController {
  constructor(
    private readonly pokemonSetService: PokemonSetService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  @Post()
  create(@Body() createPokemonSetDto: CreatePokemonSetDto) {
    return this.pokemonSetService.create(createPokemonSetDto);
  }

  @Get()
  @Public()
  findAll(@Query("limit") limit?: number) {
    return this.pokemonSetService.findAll(limit);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.pokemonSetService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updatePokemonSetDto: UpdatePokemonSetDto,
  ) {
    return this.pokemonSetService.update(id, updatePokemonSetDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.pokemonSetService.remove(id);
  }

  @Post(":id/logo")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FileInterceptor("file"))
  async uploadLogo(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    const set = await this.pokemonSetService.findOne(id);
    if (!set) {
      throw new NotFoundException(`Extension ${id} introuvable`);
    }

    // Supprimer l'ancien logo de R2 s'il existe
    if (set.logo) {
      await this.r2StorageService.deleteFile(set.logo);
    }

    const slug = slugify(set.name);
    const extension = path.extname(file.originalname) || ".webp";
    const key = `sets/${slug}/logo${extension}`;
    const logoUrl = await this.r2StorageService.uploadFile(
      file.buffer,
      key,
      file.mimetype || "image/webp",
    );

    if (!logoUrl) {
      throw new InternalServerErrorException("Échec de l'upload sur R2");
    }

    return this.pokemonSetService.update(id, { logo: logoUrl });
  }

  @Post(":id/symbol")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @UseInterceptors(FileInterceptor("file"))
  async uploadSymbol(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    const set = await this.pokemonSetService.findOne(id);
    if (!set) {
      throw new NotFoundException(`Extension ${id} introuvable`);
    }

    // Supprimer l'ancien symbole de R2 s'il existe
    if (set.symbol) {
      await this.r2StorageService.deleteFile(set.symbol);
    }

    const slug = slugify(set.name);
    const extension = path.extname(file.originalname) || ".png";
    const key = `sets/${slug}/symbol${extension}`;
    const symbolUrl = await this.r2StorageService.uploadFile(
      file.buffer,
      key,
      file.mimetype || "image/png",
    );

    if (!symbolUrl) {
      throw new InternalServerErrorException("Échec de l'upload sur R2");
    }

    return this.pokemonSetService.update(id, { symbol: symbolUrl });
  }
}
