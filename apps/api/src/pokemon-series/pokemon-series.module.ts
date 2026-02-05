import { Module } from '@nestjs/common';
import { PokemonSeriesService } from './pokemon-series.service';
import { PokemonSeriesController } from './pokemon-series.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { PokemonSerie } from './entities/pokemon-serie.entity';
import { Card } from 'src/card/entities/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PokemonSerie, PokemonSet, Card])],
  controllers: [PokemonSeriesController],
  providers: [PokemonSeriesService],
  exports: [PokemonSeriesService]
})
export class PokemonSeriesModule {}
