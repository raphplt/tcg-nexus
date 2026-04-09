import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { PokemonCardController } from "./pokemon-card.controller";
import { PokemonCardService } from "./pokemon-card.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PokemonSet,
      Card,
      PokemonCardDetails,
      PokemonSerie,
    ]),
  ],
  controllers: [PokemonCardController],
  providers: [PokemonCardService],
})
export class PokemonCardModule {}
