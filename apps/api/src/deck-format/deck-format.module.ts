import { Module } from '@nestjs/common';
import { DeckFormatService } from './deck-format.service';
import { DeckFormatController } from './deck-format.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeckFormat } from './entities/deck-format.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeckFormat])],
  controllers: [DeckFormatController],
  providers: [DeckFormatService]
})
export class DeckFormatModule {}
