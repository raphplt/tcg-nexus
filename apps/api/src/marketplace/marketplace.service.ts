import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from './entities/listing.entity';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { User, UserRole } from '../user/entities/user.entity';
import { PaginationHelper, PaginatedResult } from '../helpers/pagination';

export interface FindAllListingsParams {
  sellerId?: number;
  pokemonCardId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  cardState?: string;
  currency?: string;
  priceMin?: number;
  priceMax?: number;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>
  ) {}

  private readonly logger = new Logger(MarketplaceService.name);

  async create(createListingDto: CreateListingDto, user: User) {
    if (!createListingDto.pokemonCardId) {
      throw new BadRequestException('pokemonCardId is required');
    }
    const listing = this.listingRepository.create({
      ...createListingDto,
      seller: user,
      pokemonCard: { id: createListingDto.pokemonCardId }
    });
    return this.listingRepository.save(listing);
  }

  async findAll(
    params: FindAllListingsParams = {}
  ): Promise<PaginatedResult<Listing>> {
    const {
      sellerId,
      pokemonCardId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      cardState,
      currency,
      priceMin,
      priceMax
    } = params;
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie');

    if (sellerId) {
      qb.andWhere('seller.id = :sellerId', { sellerId });
    }
    if (pokemonCardId) {
      qb.andWhere('pokemonCard.id = :pokemonCardId', { pokemonCardId });
    }
    if (cardState) {
      qb.andWhere('listing.cardState = :cardState', { cardState });
    }
    if (currency) {
      qb.andWhere('listing.currency = :currency', { currency });
    }
    if (typeof priceMin === 'number') {
      qb.andWhere('listing.price >= :priceMin', { priceMin });
    }
    if (typeof priceMax === 'number') {
      qb.andWhere('listing.price <= :priceMax', { priceMax });
    }
    if (search) {
      qb.andWhere(
        `(
          LOWER(pokemonCard.name) LIKE :search OR LOWER(seller.firstName) LIKE :search OR LOWER(seller.lastName) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` }
      );
    }
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      sortBy ? `listing.${sortBy}` : undefined,
      sortOrder
    );
  }

  async findOne(id: number): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: [
        'seller',
        'pokemonCard',
        'pokemonCard.set',
        'pokemonCard.set.serie'
      ]
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async update(
    id: number,
    updateListingDto: UpdateListingDto,
    user: User
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller']
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus update listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`
      );
      throw new ForbiddenException(
        'You are not allowed to update this listing'
      );
    }
    Object.assign(listing, updateListingDto);
    return this.listingRepository.save(listing);
  }

  async delete(id: number, user: User): Promise<void> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller']
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.seller.id !== user.id && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Refus delete listing: user=${user.id} role=${user.role} targetListing=${id} seller=${listing.seller.id}`
      );
      throw new ForbiddenException(
        'You are not allowed to delete this listing'
      );
    }
    await this.listingRepository.delete(id);
  }

  async findBySellerId(sellerId: number): Promise<Listing[]> {
    return this.listingRepository.find({
      where: { seller: { id: sellerId } },
      relations: [
        'seller',
        'pokemonCard',
        'pokemonCard.set',
        'pokemonCard.set.serie'
      ],
      order: { createdAt: 'DESC' }
    });
  }
}
