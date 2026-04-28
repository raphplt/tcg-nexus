import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PokemonSet } from "../pokemon-set/entities/pokemon-set.entity";
import { CardController } from "./card.controller";
import { CardService } from "./card.service";
import { CardEffectsSyncService } from "./card-effects-sync.service";
import { Card } from "./entities/card.entity";
import { PokemonCardDetails } from "./entities/pokemon-card-details.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Card, PokemonCardDetails, PokemonSet])],
  controllers: [CardController],
  providers: [CardService, CardEffectsSyncService],
  exports: [CardService, CardEffectsSyncService],
})
export class CardModule {}
