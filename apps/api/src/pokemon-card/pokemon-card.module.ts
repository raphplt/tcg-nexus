import { Module } from '@nestjs/common';
import { PokemonCardService } from './pokemon-card.service';
import { PokemonCardController } from './pokemon-card.controller';

@Module({
  controllers: [PokemonCardController],
  providers: [PokemonCardService],
})
export class PokemonCardModule {}
