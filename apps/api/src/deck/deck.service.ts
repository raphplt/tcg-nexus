import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { PaginationHelper } from '../helpers/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck } from './entities/deck.entity';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { number } from 'better-auth';
export interface FindAllDecksParams {
  userId?: number;
  formatId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

@Injectable()
export class DeckService {

  constructor(
    @InjectRepository(Deck)
    private readonly decksRepository: Repository<Deck>
  ) {}
  create(createDeckDto: CreateDeckDto) {
    return 'This action adds a new deckCard';
  }

  async findAll(
    params: FindAllDecksParams = {}
  ) {
    const {
      userId = 0,
      formatId = 0,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search
    } = params;
    const qb = this.decksRepository
      .createQueryBuilder('deck')
      .leftJoinAndSelect('deck.user', 'user')
      .leftJoinAndSelect('deck.format', 'format');

    if (userId !== 0)
    {
      qb.andWhere('user.id = :userId',{ userId });
    }else
    {
      qb.andWhere('deck.isPublic = true');
    }
    if (formatId !== 0) {
      qb.andWhere('format.id = :formatId', { formatId });
    }
    if (search) {
      qb.andWhere(
        `(
          LOWER(deck.name) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` }
      );
    }
    let orderColumn: string;
    if (sortBy === 'format.type') {
      orderColumn = 'format.type';
    } else {
      orderColumn = `deck.${sortBy}`;
    }
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder
    );
  }

  findOne(id: number) {
    return `This action returns a #${id} deck`;
  }

  update(id: number, updateDeckDto: UpdateDeckDto) {
    return `This action updates a #${id} deck`;
  }

  remove(id: number) {
    return `This action removes a #${id} deck`;
  }
}
