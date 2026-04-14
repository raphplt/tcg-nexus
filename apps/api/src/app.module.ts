import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "./ai/ai.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ArticleModule } from "./article/article.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { BadgeModule } from "./badge/badge.module";
import { CardModule } from "./card/card.module";
import { CardStateModule } from "./card-state/card-state.module";
import { CollectionModule } from "./collection/collection.module";
import { CollectionItemModule } from "./collection-item/collection-item.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DeckModule } from "./deck/deck.module";
import { DeckCardModule } from "./deck-card/deck-card.module";
import { DeckFormatModule } from "./deck-format/deck-format.module";
import { FaqModule } from "./faq/faq.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { MatchModule } from "./match/match.module";
import { PlayerModule } from "./player/player.module";
import { PokemonCardModule } from "./pokemon-card/pokemon-card.module";
import { PokemonSeriesModule } from "./pokemon-series/pokemon-series.module";
import { PokemonSetModule } from "./pokemon-set/pokemon-set.module";
import { RankingModule } from "./ranking/ranking.module";
import { SearchModule } from "./search/search.module";
import { SeedModule } from "./seed/seed.module";
import { StatisticsModule } from "./statistics/statistics.module";
import { TournamentModule } from "./tournament/tournament.module";
import { UserModule } from "./user/user.module";
import { UserCartModule } from "./user_cart/user_cart.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: "." }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || "5432", 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
      ssl:
        process.env.NODE_ENV === "production" &&
        process.env.DATABASE_SSL !== "false"
          ? { rejectUnauthorized: false }
          : false,
    }),
    UserModule,
    CardModule,
    PokemonCardModule,
    PokemonSetModule,
    PokemonSeriesModule,
    MatchModule,
    TournamentModule,
    PlayerModule,
    RankingModule,
    StatisticsModule,
    SeedModule,
    AuthModule,
    ArticleModule,
    MarketplaceModule,
    CollectionModule,
    DeckModule,
    DeckCardModule,
    DeckFormatModule,
    SearchModule,
    CollectionModule,
    CollectionItemModule,
    CardStateModule,
    AiModule,
    UserCartModule,
    FaqModule,
    BadgeModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
