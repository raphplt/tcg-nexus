import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { PokemonSerieTranslation } from "./entities/pokemon-serie-translation.entity";
import { PokemonSerie } from "./entities/pokemon-serie.entity";
import { PokemonSeriesController } from "./pokemon-series.controller";
import { PokemonSeriesService } from "./pokemon-series.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PokemonSerie,
      PokemonSerieTranslation,
      PokemonSet,
      Card,
    ]),
  ],
  controllers: [PokemonSeriesController],
  providers: [PokemonSeriesService],
  exports: [PokemonSeriesService],
})
export class PokemonSeriesModule {}
