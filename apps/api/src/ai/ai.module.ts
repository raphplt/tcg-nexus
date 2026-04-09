import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { Deck } from "../deck/entities/deck.entity";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [TypeOrmModule.forFeature([Deck, Card])],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
