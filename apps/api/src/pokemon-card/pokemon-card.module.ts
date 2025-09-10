import { Module } from '@nestjs/common';
import { PokemonCardService } from './pokemon-card.service';
import { PokemonCardController } from './pokemon-card.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { PokemonCard } from './entities/pokemon-card.entity';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PokemonSet, PokemonCard, PokemonSerie])],
  controllers: [PokemonCardController],
  providers: [PokemonCardService]
})
export class PokemonCardModule {}
