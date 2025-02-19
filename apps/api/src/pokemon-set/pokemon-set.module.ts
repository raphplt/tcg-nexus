import { Module } from '@nestjs/common';
import { PokemonSetService } from './pokemon-set.service';
import { PokemonSetController } from './pokemon-set.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from './entities/pokemon-set.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PokemonSerie, PokemonCard, PokemonSet])],
  controllers: [PokemonSetController],
  providers: [PokemonSetService],
})
export class PokemonSetModule {}
