import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Player } from "src/player/entities/player.entity";
import { UserCart } from "src/user_cart/entities/user_cart.entity";
import { UserFollowModule } from "../user-follow/user-follow.module";
import { User } from "./entities/user.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserCart, Player]),
    UserFollowModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
