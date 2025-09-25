import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { Deck } from './entities/deck.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { DeckCardRole } from 'src/common/enums/deckCardRole';
import { PaginationHelper, PaginatedResult } from '../helpers/pagination';
import { User, UserRole } from '../user/entities/user.entity';

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck) private readonly deckRepo: Repository<Deck>,
    @InjectRepository(DeckCard)
    private readonly deckCardRepo: Repository<DeckCard>,
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepo: Repository<PokemonCard>
  ) {}

  async create(createDeckDto: CreateDeckDto) {
    if (!createDeckDto.userId || !createDeckDto.name) {
      throw new BadRequestException('userId and name are required');
    }
    const deck = this.deckRepo.create({
      name: createDeckDto.name,
      user: { id: createDeckDto.userId } as any,
      format: createDeckDto.formatId
        ? ({ id: createDeckDto.formatId } as any)
        : undefined
    });
    return this.deckRepo.save(deck);
  }

  async findAllForUser(
    user: User,
    query: { userId?: string; page?: number; limit?: number }
  ): Promise<PaginatedResult<Deck>> {
    const { page, limit } = PaginationHelper.validateParams({
      page: query.page,
      limit: query.limit
    });

    let resolvedUserId: number | undefined;
    if (query.userId === 'me') {
      resolvedUserId = user.id;
    } else if (query.userId) {
      resolvedUserId = parseInt(query.userId, 10);
      if (Number.isNaN(resolvedUserId)) {
        throw new BadRequestException('Invalid userId');
      }
    }

    const qb = this.deckRepo
      .createQueryBuilder('deck')
      .leftJoinAndSelect('deck.format', 'format')
      .leftJoin('deck.user', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName']);

    if (resolvedUserId) {
      qb.andWhere('user.id = :userId', { userId: resolvedUserId });
    }

    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      'deck.createdAt',
      'DESC'
    );
  }

  async findOneWithCards(id: number): Promise<Deck> {
    const deck = await this.deckRepo.findOne({
      where: { id },
      relations: ['user', 'format', 'cards', 'cards.card']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  async updateMeta(id: number, dto: UpdateDeckDto, user: User): Promise<Deck> {
    const deck = await this.deckRepo.findOne({
      where: { id },
      relations: ['user']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to update this deck');
    }
    Object.assign(deck, {
      name: dto.name ?? deck.name,
      format: dto.formatId ? ({ id: dto.formatId } as any) : deck.format
    });
    return this.deckRepo.save(deck);
  }

  async delete(id: number, user: User): Promise<void> {
    const deck = await this.deckRepo.findOne({
      where: { id },
      relations: ['user']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to delete this deck');
    }
    await this.deckRepo.delete(id);
  }

  async addCard(
    deckId: number,
    params: { cardId: string; qty: number; role?: DeckCardRole },
    user: User
  ): Promise<DeckCard> {
    const deck = await this.deckRepo.findOne({
      where: { id: deckId },
      relations: ['user']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to modify this deck');
    }
    const card = await this.pokemonCardRepo.findOne({
      where: { id: params.cardId }
    });
    if (!card) throw new NotFoundException('Pokemon card not found');
    const deckCard = this.deckCardRepo.create({
      deck: { id: deckId } as any,
      card: { id: params.cardId } as any,
      qty: params.qty || 1,
      role: params.role || DeckCardRole.main
    });
    return this.deckCardRepo.save(deckCard);
  }

  async removeCard(
    deckId: number,
    cardId: string,
    role: DeckCardRole | undefined,
    user: User
  ): Promise<void> {
    const deck = await this.deckRepo.findOne({
      where: { id: deckId },
      relations: ['user']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to modify this deck');
    }
    const where: any = { deck: { id: deckId }, card: { id: cardId } };
    if (role) where.role = role;
    const toDelete = await this.deckCardRepo.find({ where });
    if (toDelete.length === 0) return;
    await this.deckCardRepo.remove(toDelete);
  }

  async cloneDeck(id: number, user: User): Promise<Deck> {
    const deck = await this.deckRepo.findOne({
      where: { id },
      relations: ['user', 'format', 'cards', 'cards.card']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to clone this deck');
    }
    const cloned = this.deckRepo.create({
      name: `${deck.name} (copy)`,
      user: { id: user.id } as any,
      format: deck.format ? ({ id: deck.format.id } as any) : undefined
    });
    const saved = await this.deckRepo.save(cloned);
    if (deck.cards?.length) {
      const clonedCards = deck.cards.map((dc) =>
        this.deckCardRepo.create({
          deck: { id: saved.id } as any,
          card: { id: dc.card.id } as any,
          qty: dc.qty,
          role: dc.role
        })
      );
      await this.deckCardRepo.save(clonedCards);
    }
    return this.findOneWithCards(saved.id);
  }
}
