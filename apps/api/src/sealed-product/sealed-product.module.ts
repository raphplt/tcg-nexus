import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { SealedProduct } from "./entities/sealed-product.entity";
import { SealedProductLocale } from "./entities/sealed-product-locale.entity";
import { SealedProductController } from "./sealed-product.controller";
import { SealedProductService } from "./sealed-product.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([SealedProduct, SealedProductLocale, PokemonSet]),
  ],
  controllers: [SealedProductController],
  providers: [SealedProductService],
  exports: [SealedProductService],
})
export class SealedProductModule {}
