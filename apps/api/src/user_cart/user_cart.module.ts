import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCartService } from './user_cart.service';
import { UserCartController } from './user_cart.controller';
import { UserCart } from './entities/user_cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Listing } from 'src/marketplace/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCart, CartItem, Listing])],
  controllers: [UserCartController],
  providers: [UserCartService],
  exports: [UserCartService]
})
export class UserCartModule {}
