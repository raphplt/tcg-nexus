import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common';
import { CollectionItemService } from './collection-item.service';
import { CreateCollectionItemDto } from './dto/create-collection-item.dto';
import { UpdateCollectionItemDto } from './dto/update-collection-item.dto';

@Controller('collection-item')
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  @Post()
  create(@Body() createCollectionItemDto: CreateCollectionItemDto) {
    return this.collectionItemService.create(createCollectionItemDto);
  }

  @Get()
  findAll() {
    return this.collectionItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionItemService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCollectionItemDto: UpdateCollectionItemDto
  ) {
    return this.collectionItemService.update(+id, updateCollectionItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collectionItemService.remove(+id);
  }
}
