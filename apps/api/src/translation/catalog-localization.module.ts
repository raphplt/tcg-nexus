import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { CardTranslation } from "src/card/entities/card-translation.entity";
import { PokemonSerieTranslation } from "src/pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSetTranslation } from "src/pokemon-set/entities/pokemon-set-translation.entity";
import { SealedProductLocale } from "src/sealed-product/entities/sealed-product-locale.entity";

/**
 * Standalone module for catalog label resolution.
 *
 * Kept out of `CardModule`: many services need it (marketplace, collections,
 * decks, search, scan) and importing it should not drag the whole card module
 * along.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CardTranslation,
      PokemonSetTranslation,
      PokemonSerieTranslation,
      SealedProductLocale,
    ]),
  ],
  providers: [CatalogLocalizationService],
  exports: [CatalogLocalizationService],
})
export class CatalogLocalizationModule {}
