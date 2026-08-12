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
   * Visuel d'un set pour une langue donnée. Logo et symbole en dépendent :
   * TCGdex en sert une version par langue, comme les images de cartes.
   */
  async findVisual(
    setId: string,
    locale: SupportedLocale,
  ): Promise<PokemonSetTranslation | null> {
    return this.translationRepository.findOne({
      where: { setId, locale },
    });
  }

  /** Remplace le logo ou le symbole d'un set dans une langue. */
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
