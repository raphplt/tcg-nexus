import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Card } from "../card/entities/card.entity";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { User } from "../user/entities/user.entity";
import { MiniGameGateway } from "./mini-game.gateway";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([Card, SealedProduct, User]),
  ],
  providers: [MiniGameGateway],
  exports: [MiniGameGateway],
})
export class MiniGameModule {}
