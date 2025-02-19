import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PokemonSerie, PokemonSet, PokemonCard])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
