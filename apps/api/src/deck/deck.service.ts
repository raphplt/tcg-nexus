import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { PaginationHelper } from '../helpers/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck } from './entities/deck.entity';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { DeckCardRole } from '../common/enums/deckCardRole';
export interface FindAllDecksParams {
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
    @InjectRepository(DeckCard)
    private readonly deckCardRepo: Repository<DeckCard>,
    @InjectRepository(PokemonCard)
    private readonly cardRepo: Repository<PokemonCard>,
    @InjectRepository(DeckFormat)
    private readonly formatRepo: Repository<DeckFormat>,
    @InjectRepository(Deck)
    private readonly decksRepository: Repository<Deck>
  ) {}
  async createDeck(user: User, dto: CreateDeckDto) {
    const format = await this.formatRepo.findOneBy({ id: dto.formatId });
    if (!format) throw new NotFoundException('Format introuvable');

    const deck = this.decksRepository.create({
      name: dto.deckName,
      isPublic: dto.isPublic,
      user,
      format
    });

    await this.decksRepository.save(deck);
    // Créer les DeckCards
    const cards: DeckCard[] = [];
    for (const carte of dto.cards) {
      const cardEntity = await this.cardRepo.findOneBy({ id: carte.cardId });
      if (!cardEntity) {
        throw new NotFoundException(`Carte ${carte.cardId} introuvable`);
      }
      const deckCard = this.deckCardRepo.create({
        card: cardEntity,
        qty: carte.qty,
        role: carte.role,
        deck: deck
      });
      cards.push(deckCard);
    }
    // Sauvegarder toutes les cartes
    await this.deckCardRepo.save(cards);
    return await this.decksRepository.findOne({
      where: { id: deck.id },
      relations: ['cards', 'cards.card']
    });
  }

  async findAll(params: FindAllDecksParams = {}) {
    const {
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
      .leftJoinAndSelect('deck.format', 'format')
      .andWhere('deck.isPublic = true');
    if (formatId !== 0) {
      qb.andWhere('format.id = :formatId', { formatId });
    }
    if (search) {
      qb.andWhere('LOWER(deck.name) LIKE LOWER(:search)', {
        search: `%${search}%`
      });
    }
    const orderColumn =
      sortBy === 'format.type' ? 'format.type' : `deck.${sortBy}`;
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder
    );
  }

  async findAllFromUser(user: User, params: FindAllDecksParams = {}) {
    const {
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
      .leftJoinAndSelect('deck.format', 'format')
      .andWhere('user.id = :userId', { userId: user.id });
    if (formatId !== 0) {
      qb.andWhere('format.id = :formatId', { formatId });
    }
    if (search) {
      qb.andWhere('LOWER(deck.name) LIKE LOWER(:search)', {
        search: `%${search}%`
      });
    }
    const orderColumn =
      sortBy === 'format.type' ? 'format.type' : `deck.${sortBy}`;
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder
    );
  }
  async findOneWithCards(id: number): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ['user', 'format', 'cards', 'cards.card']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  async updateDeck(deckId: number, user: User, dto: UpdateDeckDto) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId, user: { id: user.id } },
      relations: ['cards']
    });

    if (!deck) throw new NotFoundException('Deck introuvable');

    if (dto.deckName) {
      deck.name = dto.deckName;
    }
    if (dto.isPublic) {
      deck.isPublic = dto.isPublic;
    }
    if (dto.formatId) {
      const format = await this.formatRepo.findOneBy({ id: dto.formatId });
      if (!format) throw new NotFoundException('Format introuvable');
      if (format) {
        deck.format = format;
      }
    }
    await this.decksRepository.save(deck);

    // Supprimer les cartes
    if (dto.cardsToRemove && dto.cardsToRemove.length) {
      await this.deckCardRepo.delete(dto.cardsToRemove.map((c) => c.id));
    }

    if (dto.cardsToAdd.length > 0) {
      const cards: DeckCard[] = [];
      for (const carte of dto.cardsToAdd) {
        const cardEntity = await this.cardRepo.findOneBy({ id: carte.cardId });
        if (!cardEntity) {
          throw new NotFoundException(`Carte ${carte.cardId} introuvable`);
        }
        const deckCard = this.deckCardRepo.create({
          card: cardEntity,
          qty: carte.qty,
          role: carte.role as DeckCardRole,
          deck: deck
        });
        cards.push(deckCard);
      }
      // Sauvegarder toutes les cartes
      await this.deckCardRepo.save(cards);
    }

    if (dto.cardsToUpdate.length > 0) {
      const cards: DeckCard[] = [];
      for (const carte of dto.cardsToUpdate) {
        const cardEntity = await this.deckCardRepo.findOneBy({ id: carte.id });
        if (!cardEntity) {
          throw new NotFoundException(`Carte ${carte.id} introuvable`);
        }
        if (carte.qty) {
          cardEntity.qty = carte.qty;
        }
        if (carte.role) {
          cardEntity.role = carte.role;
        }
        await this.deckCardRepo.save(cardEntity);
      }
      // Sauvegarder toutes les cartes
      await this.deckCardRepo.save(cards);
    }

    return this.decksRepository.findOne({
      where: { id: deck.id },
      relations: ['cards', 'cards.card']
    });
  }

  async remove(id: number) {
    const deck = await this.decksRepository.findOne({ where: { id } });
    if (!deck) throw new NotFoundException(`Deck #${id} not found`);
    await this.decksRepository.remove(deck);
    return { message: `Deck ${deck.name} supprimé avec succès` };
  }
  async cloneDeck(id: number, user: User): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ['user', 'format', 'cards', 'cards.card']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to clone this deck');
    }

    const cloned = this.decksRepository.create({
      name: `${deck.name} (copy)`,
      isPublic: deck.isPublic,
      user,
      format: deck.format
    });
    const saved = await this.decksRepository.save(cloned);
    if (deck.cards?.length) {
      const clonedCards = deck.cards.map((dc) =>
        this.deckCardRepo.create({
          deck: { id: saved.id },
          card: { id: dc.card.id },
          qty: dc.qty,
          role: dc.role
        })
      );
      await this.deckCardRepo.save(clonedCards);
    }
    return this.findOneWithCards(saved.id);
  }
}
