import { CardModule } from "src/card/card.module";
import { MarketplaceModule } from "src/marketplace/marketplace.module";
import { Listing } from "src/marketplace/entities/listing.entity";
import { CatalogLocalizationModule } from "src/translation/catalog-localization.module";
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { CardState } from "../card-state/entities/card-state.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { CollectionBulkService } from "./collection-bulk.service";
import { CollectionCompletionService } from "./collection-completion.service";
import { CollectionValuationService } from "./collection-valuation.service";
import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";
import { Collection } from "./entities/collection.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Collection,
      CollectionItem,
      Card,
      CardState,
      PokemonSet,
      Listing,
    ]),
    CardModule,
    CatalogLocalizationModule,
    forwardRef(() => MarketplaceModule),
  ],
  controllers: [CollectionController],
  providers: [
    CollectionService,
    CollectionCompletionService,
    CollectionValuationService,
    CollectionBulkService,
  ],
  exports: [
    CollectionService,
    CollectionCompletionService,
    CollectionValuationService,
    CollectionBulkService,
  ],
})
export class CollectionModule {}

