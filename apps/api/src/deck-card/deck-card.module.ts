import { Module } from "@nestjs/common";
import { DeckCardController } from "./deck-card.controller";
import { DeckCardService } from "./deck-card.service";

@Module({
  controllers: [DeckCardController],
  providers: [DeckCardService],
})
export class DeckCardModule {}
