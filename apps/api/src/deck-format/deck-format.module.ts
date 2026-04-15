import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeckFormatController } from "./deck-format.controller";
import { DeckFormatService } from "./deck-format.service";
import { DeckFormat } from "./entities/deck-format.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DeckFormat])],
  controllers: [DeckFormatController],
  providers: [DeckFormatService],
})
export class DeckFormatModule {}
