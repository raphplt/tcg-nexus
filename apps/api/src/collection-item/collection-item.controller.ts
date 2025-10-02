import { Controller, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CollectionItemService } from './collection-item.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('collection-item')
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  @Patch('wishlist/:userId')
  @Public()
  async addToWishlist(
    @Param('userId', ParseIntPipe) userId: number,
    @Body('pokemonCardId') pokemonCardId: string
  ) {
    return this.collectionItemService.addToWishlist(userId, pokemonCardId);
  }
}
