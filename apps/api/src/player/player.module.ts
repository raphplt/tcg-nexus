import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ranking } from "../ranking/entities/ranking.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { User } from "../user/entities/user.entity";
import { Player } from "./entities/player.entity";
import { PlayerController } from "./player.controller";
import { PlayerService } from "./player.service";

@Module({
  imports: [TypeOrmModule.forFeature([Player, User, Ranking, Tournament])],
  controllers: [PlayerController],
  providers: [PlayerService],
})
export class PlayerModule {}
