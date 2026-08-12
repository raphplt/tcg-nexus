import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { CardTranslation } from "src/card/entities/card-translation.entity";
import { PokemonSerieTranslation } from "src/pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSetTranslation } from "src/pokemon-set/entities/pokemon-set-translation.entity";

/**
 * Module autonome pour la résolution des libellés du catalogue.
 *
 * Isolé de `CardModule` : beaucoup de services en ont besoin (marketplace,
 * collections, decks, recherche, scan…) et l'importer ne doit pas entraîner
 * tout le module carte dans son sillage.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CardTranslation,
      PokemonSetTranslation,
      PokemonSerieTranslation,
    ]),
  ],
  providers: [CatalogLocalizationService],
  exports: [CatalogLocalizationService],
})
export class CatalogLocalizationModule {}
