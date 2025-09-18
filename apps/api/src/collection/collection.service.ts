import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';

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
        'is_public'
      ]
    });
  }

  async findByUserId(userId: string): Promise<Collection[]> {
    return await this.collectionRepository.find({
      where: { user: { id: Number(userId) } },
      relations: ['user', 'items']
    });
  }

  // async create(createCollectionDto: CreateCollectionDto): Promise<Collection> {
  //   const { userId, ...data } = createCollectionDto;
  //   const newCollection = this.collectionRepository.create({
  //     ...data,
  //     user: { id: Number(userId) } // Associe l'utilisateur à la collection
  //   });
  //   return await this.collectionRepository.save(newCollection);
  // }
}
