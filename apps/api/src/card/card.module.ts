import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PokemonSerieTranslation } from "../pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { PokemonSetTranslation } from "../pokemon-set/entities/pokemon-set-translation.entity";
import { CardController } from "./card.controller";
import { CardService } from "./card.service";
import { CardEffectsSyncService } from "./card-effects-sync.service";
import { CatalogLocalizationService } from "./catalog-localization.service";
import { Card } from "./entities/card.entity";
import { CardTranslation } from "./entities/card-translation.entity";
import { PokemonCardDetails } from "./entities/pokemon-card-details.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      CardTranslation,
      PokemonCardDetails,
      PokemonSet,
      PokemonSetTranslation,
      PokemonSerieTranslation,
    ]),
  ],
  controllers: [CardController],
  providers: [CardService, CardEffectsSyncService, CatalogLocalizationService],
  exports: [CardService, CardEffectsSyncService, CatalogLocalizationService],
})
export class CardModule {}
