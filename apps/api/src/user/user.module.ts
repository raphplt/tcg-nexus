import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Deck } from "src/deck/entities/deck.entity";
import { Match } from "src/match/entities/match.entity";
import { MatchResultProposal } from "src/match/entities/match-result-proposal.entity";
import { Order } from "src/marketplace/entities/order.entity";
import { Player } from "src/player/entities/player.entity";
import { TournamentDeckSnapshot } from "src/tournament/entities/tournament-deck-snapshot.entity";
import { TournamentRegistration } from "src/tournament/entities/tournament-registration.entity";
import { UserCart } from "src/user_cart/entities/user_cart.entity";
import { UserFollowModule } from "../user-follow/user-follow.module";
import { User } from "./entities/user.entity";
import { UserController } from "./user.controller";
import { UserJourneyService } from "./user-journey.service";
import { UserService } from "./user.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCart,
      Player,
      Order,
      Deck,
      TournamentRegistration,
      Match,
      MatchResultProposal,
      TournamentDeckSnapshot,
      CollectionItem,
    ]),
    UserFollowModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserJourneyService],
  exports: [UserService, UserJourneyService],
})
export class UserModule {}

