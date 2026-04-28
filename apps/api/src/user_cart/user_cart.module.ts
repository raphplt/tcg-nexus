import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Listing } from "src/marketplace/entities/listing.entity";
import { CartItem } from "./entities/cart-item.entity";
import { UserCart } from "./entities/user_cart.entity";
import { UserCartController } from "./user_cart.controller";
import { UserCartService } from "./user_cart.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserCart, CartItem, Listing])],
  controllers: [UserCartController],
  providers: [UserCartService],
  exports: [UserCartService],
})
export class UserCartModule {}
