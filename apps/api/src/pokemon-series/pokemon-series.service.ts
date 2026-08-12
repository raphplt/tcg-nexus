import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardGame } from "src/common/enums/cardGame";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "src/translation/supported-locales";
import { Repository } from "typeorm";
import { CreatePokemonSeryDto } from "./dto/create-pokemon-sery.dto";
import { UpdatePokemonSeryDto } from "./dto/update-pokemon-sery.dto";
import { PokemonSerieTranslation } from "./entities/pokemon-serie-translation.entity";
import { PokemonSerie } from "./entities/pokemon-serie.entity";

@Injectable()
export class PokemonSeriesService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSeriesRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSerieTranslation)
    private readonly translationRepository: Repository<PokemonSerieTranslation>,
  ) {}

  /**
   * Creates a series along with its name and logo in one language.
   *
   * @param createPokemonSeryDto - Identifier, labels and target language.
   * @returns The created series, resolved in that language.
   */
  async create(
    createPokemonSeryDto: CreatePokemonSeryDto,
  ): Promise<PokemonSerie | null> {
    const { id, name, logo, locale = DEFAULT_LOCALE } = createPokemonSeryDto;

    await this.pokemonSeriesRepository.save(
      this.pokemonSeriesRepository.create({ id, game: CardGame.Pokemon }),
    );
    await this.updateVisual(id, locale, { name, logo });

    return this.findOne(id);
  }

  async findAll(): Promise<PokemonSerie[]> {
    return (
      this.pokemonSeriesRepository
        .createQueryBuilder("serie")
        // Name and logo are attached by `CatalogLocalizationInterceptor`: sorting by release date is locale-independent.
        .select(["serie.id"])
        .leftJoin("serie.sets", "set")
        .where("serie.game = :game", { game: CardGame.Pokemon })
        .groupBy("serie.id")
        .addSelect("MIN(set.releaseDate)", "minReleaseDate")
        .orderBy("MIN(set.releaseDate)", "ASC")
        .getRawAndEntities()
        .then((result) => result.entities)
    );
  }

  async findOne(id: string): Promise<PokemonSerie | null> {
    return this.pokemonSeriesRepository.findOne({
      where: { id, game: CardGame.Pokemon },
    });
  }

  /**
   * Updates a series. Name and logo live in translations, so they apply to the
   * requested language only.
   *
   * @param id - Series identifier.
   * @param updatePokemonSeryDto - Fields to update and target language.
   * @returns The updated series, resolved in that language.
   */
  async update(id: string, updatePokemonSeryDto: UpdatePokemonSeryDto) {
    const { name, logo, locale = DEFAULT_LOCALE } = updatePokemonSeryDto;

    if (name !== undefined || logo !== undefined) {
      await this.updateVisual(id, locale, { name, logo });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.pokemonSeriesRepository.delete(id);
    return { deleted: true };
  }

  /**
   * Name and logo of a series in a given language. The logo depends on it:
   * TCGdex serves one version per language, as it does for card images.
   *
   * @param serieId - Series identifier.
   * @param locale - Target language.
   * @returns The translation row, or `null` when the language is missing.
   */
  async findVisual(
    serieId: string,
    locale: SupportedLocale,
  ): Promise<PokemonSerieTranslation | null> {
    return this.translationRepository.findOne({ where: { serieId, locale } });
  }

  /**
   * Replaces the name or logo of a series in a given language.
   *
   * @param serieId - Series identifier.
   * @param locale - Target language.
   * @param visual - Fields to write; those left undefined are untouched.
   * @returns The resulting translation row.
   */
  async updateVisual(
    serieId: string,
    locale: SupportedLocale,
    visual: { name?: string; logo?: string },
  ): Promise<PokemonSerieTranslation> {
    const changes = Object.fromEntries(
      Object.entries(visual).filter(([, value]) => value !== undefined),
    );

    await this.translationRepository.upsert({ serieId, locale, ...changes }, [
      "serieId",
      "locale",
    ]);

    return this.translationRepository.findOneOrFail({
      where: { serieId, locale },
    });
  }

  import() {
    return `This action imports pokemonSeries`;
  }
}
