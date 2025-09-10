import { Module } from '@nestjs/common';
import { CardStateService } from './card-state.service';
import { CardStateController } from './card-state.controller';

@Module({
  controllers: [CardStateController],
  providers: [CardStateService],
})
export class CardStateModule {}
