import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PokemonCard } from './entities/pokemon-card.entity';
import { CreatePokemonCardDto } from './dto/create-pokemon-card.dto';
import { UpdatePokemonCardDto } from './dto/update-pokemon-card.dto';
import { PaginationHelper, PaginatedResult } from '../helpers/pagination';

@Injectable()
export class PokemonCardService {
  constructor(
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepository: Repository<PokemonCard>
  ) {}

  async create(
    createPokemonCardDto: CreatePokemonCardDto
  ): Promise<PokemonCard> {
    const newCard = this.pokemonCardRepository.create(createPokemonCardDto);
    return await this.pokemonCardRepository.save(newCard);
  }

  async findAll(): Promise<PokemonCard[]> {
    return await this.pokemonCardRepository.find();
  }

  async findOne(id: string): Promise<PokemonCard> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id },
      relations: ['set']
    });
    if (!card) {
      throw new Error(`PokemonCard with id ${id} not found`);
    }
    return card;
  }

  async findBySearch(search: string): Promise<PokemonCard[]> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set');

    if (!search) {
      return [];
    }

    qb.where('card.name ILIKE :search', { search: `%${search}%` })
      .orWhere('card.rarity ILIKE :search', { search: `%${search}%` })
      .orWhere('set.name ILIKE :search', { search: `%${search}%` });

    return qb.getMany();
  }

  async update(
    id: string,
    updatePokemonCardDto: UpdatePokemonCardDto
  ): Promise<PokemonCard> {
    await this.pokemonCardRepository.update(id, updatePokemonCardDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.pokemonCardRepository.delete(id);
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<PokemonCard>> {
    const { page: validPage, limit: validLimit } =
      PaginationHelper.validateParams({
        page,
        limit
      });

    const offset = PaginationHelper.calculateOffset(validPage, validLimit);

    const [data, totalItems] = await this.pokemonCardRepository.findAndCount({
      relations: ['set'],
      skip: offset,
      take: validLimit,
      order: { name: 'ASC' }
    });

    return PaginationHelper.createPaginatedResult(
      data,
      totalItems,
      validPage,
      validLimit
    );
  }

  // async findRandom(): Promise<PokemonCard> {
  //   const count = await this.pokemonCardRepository.count();
  //   const randomIndex = Math.floor(Math.random() * count);
  //   const randomCard = await this.pokemonCardRepository.find({
  //     skip: randomIndex,
  //     take: 1
  //   });
  //   return randomCard[0];
  // }

  // pokemon-card.service.ts

  async findRandom(
    serieId?: string,
    rarity?: string
  ): Promise<PokemonCard | null> {
    console.log(
      'Fetching random card with serieId:',
      serieId,
      'and rarity:',
      rarity
    );

    const qb = this.pokemonCardRepository
      .createQueryBuilder('pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'pokemonSet')
      .leftJoin('pokemonSet.serie', 'pokemonSerie');

    if (serieId && serieId.trim() !== '') {
      qb.andWhere('pokemonSerie.id = :serieId', { serieId });
    }

    if (rarity && rarity.trim() !== '') {
      qb.andWhere('pokemonCard.rarity = :rarity', { rarity });
    }

    console.log(
      'Querying for random card lucas:',
      qb.getQuery(),
      qb.getParameters()
    );

    const card = await qb.orderBy('RANDOM()').limit(1).getOne();
    return card ?? null;
  }
}
