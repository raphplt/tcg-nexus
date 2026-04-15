import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CardStateController } from "./card-state.controller";
import { CardStateService } from "./card-state.service";
import { CardState } from "./entities/card-state.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CardState])],
  controllers: [CardStateController],
  providers: [CardStateService],
  exports: [CardStateService],
})
export class CardStateModule {}
