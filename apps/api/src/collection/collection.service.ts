import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from '../collection-item/entities/collection-item.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private collectionItemRepository: Repository<CollectionItem>
  ) {}

  async findAll(): Promise<Collection[]> {
    return this.collectionRepository.find({
      select: [
        'id',
        'name',
        'description',
        'created_at',
        'updated_at',
        'user',
        'isPublic'
      ],
      where: { isPublic: true },
      relations: ['user']
    });
  }

  async findByUserId(userId: string): Promise<Collection[]> {
    return await this.collectionRepository.find({
      where: { user: { id: Number(userId) } },
      relations: ['user', 'items']
    });
  }

  async findOneById(id: string): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ['items', 'user']
    });
    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }
    return collection;
  }

  async create(createCollectionDto: CreateCollectionDto): Promise<Collection> {
    const collection = this.collectionRepository.create({
      name: createCollectionDto.name,
      description: createCollectionDto.description,
      isPublic: createCollectionDto.isPublic || false
    });
    collection.user = { id: Number(createCollectionDto.userId) } as User;
    return await this.collectionRepository.save(collection);
  }

  async update(
    id: string,
    updateCollectionDto: UpdateCollectionDto,
    userId: number
  ): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ['user']
    });

    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (collection.user.id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres collections'
      );
    }

    Object.assign(collection, updateCollectionDto);

    return await this.collectionRepository.save(collection);
  }

  async delete(id: string, userId: number): Promise<void> {
    const collection = await this.collectionRepository.findOne({
      where: { id: id },
      relations: ['user']
    });

    if (!collection) {
      throw new NotFoundException(`Collection with id ${id} not found`);
    }

    if (collection.user.id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres collections'
      );
    }

    await this.collectionRepository.delete(id);
  }

  async findAllPaginated(
    page: number,
    limit: number
  ): Promise<{
    collections: Collection[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [collections, total] = await this.collectionRepository.findAndCount({
      where: { isPublic: true },
      relations: ['user'],
      skip,
      take: limit,
      order: { created_at: 'DESC' }
    });

    return {
      collections,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findCollectionItemsPaginated(
    collectionId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy: string = 'added_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{
    data: CollectionItem[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    // Vérifier que la collection existe
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId }
    });
    if (!collection) {
      throw new NotFoundException(
        `Collection with id ${collectionId} not found`
      );
    }

    const skip = (page - 1) * limit;

    // Construire la query avec recherche
    const queryBuilder = this.collectionItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('item.cardState', 'cardState')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .where('item.collection.id = :collectionId', { collectionId });

    // Ajouter la recherche si fournie
    if (search) {
      queryBuilder.andWhere(
        '(pokemonCard.name ILIKE :search OR pokemonCard.rarity ILIKE :search OR set.name ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Trier
    const validSortBy = [
      'added_at',
      'quantity',
      'pokemonCard.name',
      'pokemonCard.rarity'
    ];
    const sortField = validSortBy.includes(sortBy) ? sortBy : 'added_at';

    if (
      sortField === 'pokemonCard.name' ||
      sortField === 'pokemonCard.rarity'
    ) {
      queryBuilder.orderBy(sortField, sortOrder);
    } else {
      queryBuilder.orderBy(`item.${sortField}`, sortOrder);
    }

    // Compter le total
    const totalItems = await queryBuilder.getCount();

    // Appliquer pagination
    const items = await queryBuilder.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }
}
