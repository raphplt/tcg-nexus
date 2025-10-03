import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PokemonCardModule } from './pokemon-card/pokemon-card.module';
import { PokemonSetModule } from './pokemon-set/pokemon-set.module';
import { PokemonSeriesModule } from './pokemon-series/pokemon-series.module';
import { SeedModule } from './seed/seed.module';
import { MatchModule } from './match/match.module';
import { StatisticsModule } from './statistics/statistics.module';
import { RankingModule } from './ranking/ranking.module';
import { PlayerModule } from './player/player.module';
import { TournamentModule } from './tournament/tournament.module';
import { AuthModule } from './auth/auth.module';
import { ArticleModule } from './article/article.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { DeckModule } from './deck/deck.module';
import { DeckCardModule } from './deck-card/deck-card.module';
import { DeckFormatModule } from './deck-format/deck-format.module';
import { SearchModule } from './search/search.module';
import { CollectionModule } from './collection/collection.module';
import { CollectionItemModule } from './collection-item/collection-item.module';
import { CardStateModule } from './card-state/card-state.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true
    }),
    UserModule,
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
    CardStateModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AppModule {}
