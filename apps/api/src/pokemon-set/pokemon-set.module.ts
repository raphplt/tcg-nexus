import { Module } from '@nestjs/common';
import { PokemonSetService } from './pokemon-set.service';
import { PokemonSetController } from './pokemon-set.controller';

@Module({
  controllers: [PokemonSetController],
  providers: [PokemonSetService],
})
export class PokemonSetModule {}
