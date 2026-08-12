import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardGame } from "src/common/enums/cardGame";
import { Repository } from "typeorm";
import { CreatePokemonSetDto } from "./dto/create-pokemon-set.dto";
import { UpdatePokemonSetDto } from "./dto/update-pokemon-set.dto";
import { PokemonSet } from "./entities/pokemon-set.entity";
import { PokemonSetTranslation } from "./entities/pokemon-set-translation.entity";
import type { SupportedLocale } from "src/translation/supported-locales";

@Injectable()
export class PokemonSetService {
  constructor(
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(PokemonSetTranslation)
    private readonly translationRepository: Repository<PokemonSetTranslation>,
  ) {}

  async create(createPokemonSetDto: CreatePokemonSetDto): Promise<PokemonSet> {
    const pokemonSet = this.pokemonSetRepository.create({
      ...createPokemonSetDto,
      game: CardGame.Pokemon,
    });
    return this.pokemonSetRepository.save(pokemonSet);
  }

  async findAll(limit?: number): Promise<PokemonSet[]> {
    const query = this.pokemonSetRepository
      .createQueryBuilder("set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("set.game = :game", { game: CardGame.Pokemon })
      .orderBy("set.releaseDate", "DESC");

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<PokemonSet> {
    const pokemonSet = await this.pokemonSetRepository.findOne({
      where: { id, game: CardGame.Pokemon },
      relations: ["serie"],
    });
    if (!pokemonSet) {
      throw new Error(`PokemonSet with id ${id} not found`);
    }
    return pokemonSet;
  }

  async update(
    id: string,
    updatePokemonSetDto: UpdatePokemonSetDto,
  ): Promise<PokemonSet> {
    const existing = await this.findOne(id);
    this.pokemonSetRepository.merge(existing, updatePokemonSetDto);
    return this.pokemonSetRepository.save(existing);
  }

  async remove(id: string): Promise<void> {
    await this.pokemonSetRepository.delete(id);
  }

  /**
   * Visuals of a set in a given language. Logo and symbol depend on it:
   * TCGdex serves one version per language, as it does for card images.
   *
   * @param setId - Set identifier.
   * @param locale - Target language.
   * @returns The translation row, or `null` when the language is missing.
   */
  async findVisual(
    setId: string,
    locale: SupportedLocale,
  ): Promise<PokemonSetTranslation | null> {
    return this.translationRepository.findOne({
      where: { setId, locale },
    });
  }

  /**
   * Replaces the logo or symbol of a set in a given language.
   *
   * @param setId - Set identifier.
   * @param locale - Target language.
   * @param visual - Fields to write.
   * @returns The resulting translation row.
   */
  async updateVisual(
    setId: string,
    locale: SupportedLocale,
    visual: { logo?: string; symbol?: string },
  ): Promise<PokemonSetTranslation> {
    await this.translationRepository.upsert({ setId, locale, ...visual }, [
      "setId",
      "locale",
    ]);

    return this.translationRepository.findOneOrFail({
      where: { setId, locale },
    });
  }
}
