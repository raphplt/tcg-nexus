import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from './entities/listing.entity';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { User, UserRole } from '../user/entities/user.entity';

export interface FindAllListingsParams {
  sellerId?: number;
  pokemonCardId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>
  ) {}

  async create(createListingDto: CreateListingDto) {
    if (!createListingDto.sellerId || !createListingDto.pokemonCardId) {
      throw new BadRequestException('sellerId and pokemonCardId are required');
    }
    const listing = this.listingRepository.create({
      ...createListingDto,
      seller: { id: createListingDto.sellerId },
      pokemonCard: { id: createListingDto.pokemonCardId }
    });
    return this.listingRepository.save(listing);
  }

  async findAll(params: FindAllListingsParams = {}): Promise<{
    data: Listing[];
    total: number;
    page: number;
    pageCount: number;
  }> {
    const { sellerId, pokemonCardId, page = 1, limit = 20 } = params;
    const where: Record<string, any> = {};
    if (sellerId) where.seller = { id: sellerId };
    if (pokemonCardId) where.pokemonCard = { id: pokemonCardId };
    const [data, total] = await this.listingRepository.findAndCount({
      where,
      relations: ['seller', 'pokemonCard'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });
    return {
      data,
      total,
      page,
      pageCount: Math.ceil(total / limit)
    };
  }

  async findOne(id: number): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller', 'pokemonCard']
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
      throw new ForbiddenException(
        'You are not allowed to delete this listing'
      );
    }
    await this.listingRepository.delete(id);
  }
}
