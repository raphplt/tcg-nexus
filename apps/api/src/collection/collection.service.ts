import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>
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
}
