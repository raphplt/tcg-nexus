import { Controller, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CollectionItemService } from './collection-item.service';

@Controller('collection-item')
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  @Patch('wishlist/:userId')
  async addToWishlist(
    @Param('userId', ParseIntPipe) userId: number,
    @Body('pokemonCardId') pokemonCardId: string
  ) {
    return this.collectionItemService.addToWishlist(userId, pokemonCardId);
  }
}
