import { Controller, Post, Param, Body } from '@nestjs/common';
import { CollectionItemService } from './collection-item.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('collection-item')
export class CollectionItemController {
  constructor(private readonly collectionItemService: CollectionItemService) {}

  @Post('wishlist/:userId')
  @Public()
  async addToWishlist(
    @Param('userId') userId: string,
    @Body('pokemonCardId') pokemonCardId: string
  ) {
    return this.collectionItemService.addToWishlist(userId, pokemonCardId);
  }

  @Post('favorites/:userId')
  @Public()
  async addToFavorites(
    @Param('userId') userId: string,
    @Body('pokemonCardId') pokemonCardId: string
  ) {
    return this.collectionItemService.addToFavorites(userId, pokemonCardId);
  }

  @Post('collection/:collectionId')
  @Public()
  async addToCollection(
    @Param('collectionId') collectionId: string,
    @Body('pokemonCardId') pokemonCardId: string
  ) {
    return this.collectionItemService.addToCollection(
      collectionId,
      pokemonCardId
    );
  }
}
