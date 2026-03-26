import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import { PaginationHelper, PaginatedResult } from '../helpers/pagination';
import { CardGame } from '../common/enums/cardGame';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>
  ) {}

  async findAll(game?: CardGame): Promise<Card[]> {
    return this.cardRepository.find({
      where: game ? { game } : {},
      relations: ['set', 'pokemonDetails']
    });
  }

  async findOne(id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['set', 'pokemonDetails']
    });
    if (!card) {
      throw new Error(`Card with id ${id} not found`);
    }
    return card;
  }

  async findBySearch(search: string, game?: CardGame): Promise<Card[]> {
    if (!search) return [];
    const qb = this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .leftJoinAndSelect('card.pokemonDetails', 'pokemonDetails');

    if (game) {
      qb.where('card.game = :game', { game });
    }

    qb.andWhere(
      '(card.name ILIKE :search OR card.rarity ILIKE :search OR set.name ILIKE :search OR pokemonDetails.description ILIKE :search)',
      { search: `%${search}%` }
    );

    return qb.getMany();
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    game?: CardGame
  ): Promise<PaginatedResult<Card>> {
    const { page: validPage, limit: validLimit } =
      PaginationHelper.validateParams({
        page,
        limit
      });

    const offset = PaginationHelper.calculateOffset(validPage, validLimit);

    const [data, totalItems] = await this.cardRepository.findAndCount({
      where: game ? { game } : {},
      relations: ['set', 'pokemonDetails'],
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

  async findRandom(game?: CardGame): Promise<Card | null> {
    const qb = this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .leftJoinAndSelect('card.pokemonDetails', 'pokemonDetails');

    if (game) {
      qb.where('card.game = :game', { game });
    }

    const card = await qb.orderBy('RANDOM()').limit(1).getOne();
    return card ?? null;
  }
}
