import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePokemonSeryDto } from './dto/create-pokemon-sery.dto';
import { UpdatePokemonSeryDto } from './dto/update-pokemon-sery.dto';
import { PokemonSerie } from './entities/pokemon-serie.entity';
import { CardGame } from 'src/common/enums/cardGame';

@Injectable()
export class PokemonSeriesService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSeriesRepository: Repository<PokemonSerie>
  ) {}

  create(createPokemonSeryDto: CreatePokemonSeryDto) {
    return this.pokemonSeriesRepository.save(
      this.pokemonSeriesRepository.create({
        ...createPokemonSeryDto,
        game: CardGame.Pokemon
      })
    );
  }

  async findAll(): Promise<PokemonSerie[]> {
    return this.pokemonSeriesRepository
      .createQueryBuilder('serie')
      .select(['serie.id', 'serie.name', 'serie.logo'])
      .leftJoin('serie.sets', 'set')
      .where('serie.game = :game', { game: CardGame.Pokemon })
      .groupBy('serie.id')
      .addGroupBy('serie.name')
      .addGroupBy('serie.logo')
      .addSelect('MAX(set.releaseDate)', 'maxReleaseDate')
      .orderBy('MAX(set.releaseDate)', 'DESC')
      .addOrderBy('serie.name', 'ASC')
      .getRawAndEntities()
      .then((result) => result.entities);
  }

  async findOne(id: string): Promise<PokemonSerie | null> {
    return this.pokemonSeriesRepository.findOne({
      where: { id, game: CardGame.Pokemon },
      select: ['id', 'name', 'logo']
    });
  }

  async update(id: string, updatePokemonSeryDto: UpdatePokemonSeryDto) {
    await this.pokemonSeriesRepository.update(id, updatePokemonSeryDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.pokemonSeriesRepository.delete(id);
    return { deleted: true };
  }

  import() {
    return `This action imports pokemonSeries`;
  }
}
