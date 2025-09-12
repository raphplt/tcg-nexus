import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Listing } from '../marketplace/entities/listing.entity';
import { User } from '../user/entities/user.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PokemonCard, Tournament, Player, Listing, User])
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService]
})
export class SearchModule {}
