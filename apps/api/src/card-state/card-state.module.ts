import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardStateService } from './card-state.service';
import { CardStateController } from './card-state.controller';
import { CardState } from './entities/card-state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CardState])],
  controllers: [CardStateController],
  providers: [CardStateService],
  exports: [CardStateService]
})
export class CardStateModule {}
