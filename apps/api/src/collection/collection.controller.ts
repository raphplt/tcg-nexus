import { Controller, Get, Param } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { Collection } from './entities/collection.entity';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  findAll() {
    return this.collectionService.findAll();
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.collectionService.findByUserId(userId);
  }

  @Get(':id')
  findOneById(@Param('id') id: string): Promise<Collection> {
    console.log('Fetching collection with ID:', id);
    return this.collectionService.findOneById(id);
  }
}
