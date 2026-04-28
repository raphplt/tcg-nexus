import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Listing } from "src/marketplace/entities/listing.entity";
import { PriceHistory } from "src/marketplace/entities/price-history.entity";
import { SealedEvent } from "src/marketplace/entities/sealed-event.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { SealedProduct } from "./entities/sealed-product.entity";
import { SealedProductLocale } from "./entities/sealed-product-locale.entity";
import { SealedProductController } from "./sealed-product.controller";
import { SealedProductService } from "./sealed-product.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SealedProduct,
      SealedProductLocale,
      PokemonSet,
      Listing,
      PriceHistory,
      SealedEvent,
    ]),
  ],
  controllers: [SealedProductController],
  providers: [SealedProductService],
  exports: [SealedProductService],
})
export class SealedProductModule {}
