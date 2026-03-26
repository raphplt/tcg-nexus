import { Module } from '@nestjs/common';
import { PokemonSetService } from './pokemon-set.service';
import { PokemonSetController } from './pokemon-set.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from 'src/card/entities/card.entity';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from './entities/pokemon-set.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PokemonSerie, Card, PokemonSet])],
  controllers: [PokemonSetController],
  providers: [PokemonSetService]
})
export class PokemonSetModule {}
