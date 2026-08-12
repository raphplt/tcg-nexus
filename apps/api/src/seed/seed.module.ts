import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Article } from "src/article/entities/article.entity";
import { Card } from "src/card/entities/card.entity";
import { CardTranslation } from "src/card/entities/card-translation.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import { CardState } from "src/card-state/entities/card-state.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { Deck } from "src/deck/entities/deck.entity";
import { DeckCard } from "src/deck-card/entities/deck-card.entity";
import { DeckFormat } from "src/deck-format/entities/deck-format.entity";
import { Faq } from "src/faq/entities/faq.entity";
import {
  CardEvent,
  CardPopularityMetrics,
  Listing,
  PriceHistory,
} from "src/marketplace/entities";
import { Match } from "src/match/entities/match.entity";
import { OnlineMatchSession } from "src/match/entities/online-match-session.entity";
import { MatchModule } from "src/match/match.module";
import { Player } from "src/player/entities/player.entity";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { PokemonSerieTranslation } from "src/pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { PokemonSetTranslation } from "src/pokemon-set/entities/pokemon-set-translation.entity";
import { Ranking } from "src/ranking/entities/ranking.entity";
import { SealedProductModule } from "src/sealed-product/sealed-product.module";
import { Statistics } from "src/statistics/entities/statistic.entity";
import { Tournament } from "src/tournament/entities/tournament.entity";
import { TournamentNotification } from "src/tournament/entities/tournament-notification.entity";
import { TournamentOrganizer } from "src/tournament/entities/tournament-organizer.entity";
import { TournamentPricing } from "src/tournament/entities/tournament-pricing.entity";
import { TournamentRegistration } from "src/tournament/entities/tournament-registration.entity";
import { TournamentReward } from "src/tournament/entities/tournament-reward.entity";
import { TournamentModule } from "src/tournament/tournament.module";
import { User } from "src/user/entities/user.entity";
import { CatalogImportService } from "./catalog-import.service";
import { SeedController } from "./seed.controller";
import { SeedService } from "./seed.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PokemonSerie,
      PokemonSerieTranslation,
      PokemonSet,
      PokemonSetTranslation,
      Card,
      CardTranslation,
      PokemonCardDetails,
      User,
      Tournament,
      Player,
      Ranking,
      Match,
      OnlineMatchSession,
      TournamentRegistration,
      TournamentReward,
      TournamentPricing,
      TournamentOrganizer,
      TournamentNotification,
      Article,
      Listing,
      PriceHistory,
      CardEvent,
      CardPopularityMetrics,
      Deck,
      DeckFormat,
      DeckCard,
      Collection,
      CardState,
      Statistics,
      Faq,
    ]),
    ConfigModule,
    MatchModule,
    SealedProductModule,
    TournamentModule,
  ],
  controllers: [SeedController],
  providers: [SeedService, CatalogImportService],
  exports: [CatalogImportService],
})
export class SeedModule {}
