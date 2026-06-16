import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Deck } from "../deck/entities/deck.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { UserFollowModule } from "../user-follow/user-follow.module";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Deck, TournamentRegistration]),
    UserFollowModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
