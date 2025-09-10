import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { User } from 'src/user/entities/user.entity';
import { Tournament } from 'src/tournament/entities/tournament.entity';
import { Player } from 'src/player/entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import { Match } from 'src/match/entities/match.entity';
import { TournamentRegistration } from 'src/tournament/entities/tournament-registration.entity';
import { TournamentReward } from 'src/tournament/entities/tournament-reward.entity';
import { TournamentPricing } from 'src/tournament/entities/tournament-pricing.entity';
import { TournamentOrganizer } from 'src/tournament/entities/tournament-organizer.entity';
import { TournamentNotification } from 'src/tournament/entities/tournament-notification.entity';
import { Article } from 'src/article/entities/article.entity';
import { Listing } from 'src/marketplace/entities';
import { Deck } from 'src/deck/entities/deck.entity';
import { DeckFormat } from 'src/deck-format/entities/deck-format.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { Collection } from 'src/collection/entities/collection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PokemonSerie,
      PokemonSet,
      PokemonCard,
      User,
      Tournament,
      Player,
      Ranking,
      Match,
      TournamentRegistration,
      TournamentReward,
      TournamentPricing,
      TournamentOrganizer,
      TournamentNotification,
      Article,
      Listing,
      Deck,
      DeckFormat,
      DeckCard,
      Collection
    ])
  ],
  controllers: [SeedController],
  providers: [SeedService]
})
export class SeedModule {}
