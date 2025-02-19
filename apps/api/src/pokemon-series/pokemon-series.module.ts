import { Module } from '@nestjs/common';
import { PokemonSeriesService } from './pokemon-series.service';
import { PokemonSeriesController } from './pokemon-series.controller';

@Module({
  controllers: [PokemonSeriesController],
  providers: [PokemonSeriesService],
})
export class PokemonSeriesModule {}
