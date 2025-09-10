import { Injectable } from '@nestjs/common';
import { CreateCollectionItemDto } from './dto/create-collection-item.dto';
import { UpdateCollectionItemDto } from './dto/update-collection-item.dto';

@Injectable()
export class CollectionItemService {
  create(createCollectionItemDto: CreateCollectionItemDto) {
    return 'This action adds a new collectionItem';
  }

  findAll() {
    return `This action returns all collectionItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} collectionItem`;
  }

  update(id: number, updateCollectionItemDto: UpdateCollectionItemDto) {
    return `This action updates a #${id} collectionItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} collectionItem`;
  }
}
