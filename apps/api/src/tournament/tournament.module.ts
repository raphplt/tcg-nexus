import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { Card } from "../card/entities/card.entity";
import { Deck } from "../deck/entities/deck.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { Match } from "../match/entities/match.entity";
import { MatchResultProposal } from "../match/entities/match-result-proposal.entity";
import { MatchModule } from "../match/match.module";
import { Player } from "../player/entities/player.entity";
import { RankedMatchHistory } from "../ranking/entities/ranked-match-history.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
import { RankingModule } from "../ranking/ranking.module";
import { User } from "../user/entities/user.entity";
import { DeckLegalityModule } from "./deck-legality.module";
import {
  RegistrationPayment,
  Tournament,
  TournamentDeckSnapshot,
  TournamentNotification,
  TournamentOrganizer,
  TournamentPricing,
  TournamentRegistration,
  TournamentReward,
} from "./entities";
import { TournamentDeckSnapshotRevision } from "./entities/tournament-deck-snapshot-revision.entity";
import {
  TournamentOrganizerGuard,
  TournamentOwnerGuard,
  TournamentParticipantGuard,
  TournamentVisibilityGuard,
} from "./guards";
import { PublicTournamentDataInterceptor } from "./interceptors/public-tournament-data.interceptor";
import { BracketService } from "./services/bracket.service";
import { ExternalTournamentSyncService } from "./services/external-tournament-sync.service";
import { SeedingService } from "./services/seeding.service";
import { TournamentDeckSnapshotService } from "./services/tournament-deck-snapshot.service";
import { TournamentIncidentService } from "./services/tournament-incident.service";
import { TournamentOrchestrationService } from "./services/tournament-orchestration.service";
import { TournamentRoundClockService } from "./services/tournament-round-clock.service";
import { TournamentStateService } from "./services/tournament-state.service";
import { SwissPairingModule } from "./swiss-pairing.module";
import { TournamentController } from "./tournament.controller";
import { TournamentService } from "./tournament.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentRegistration,
      TournamentReward,
      TournamentPricing,
      TournamentOrganizer,
      TournamentNotification,
      RegistrationPayment,
      TournamentDeckSnapshot,
      TournamentDeckSnapshotRevision,
      Player,
      User,
      Match,
      MatchResultProposal,
      Ranking,
      Deck,
      DeckFormat,
      Card,
      RankedMatchHistory,
    ]),
    RankingModule,
    MatchModule,
    SwissPairingModule,
    AuditModule,
    DeckLegalityModule,
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    BracketService,
    SeedingService,
    TournamentOrchestrationService,
    TournamentStateService,
    TournamentDeckSnapshotService,
    TournamentRoundClockService,
    TournamentIncidentService,
    TournamentOrganizerGuard,
    TournamentParticipantGuard,
    TournamentOwnerGuard,
    TournamentVisibilityGuard,
    PublicTournamentDataInterceptor,
    ExternalTournamentSyncService,
  ],
  exports: [
    TournamentService,
    BracketService,
    SeedingService,
    TournamentOrchestrationService,
    TournamentStateService,
    TournamentDeckSnapshotService,
    TournamentRoundClockService,
    TournamentIncidentService,
  ],
})
export class TournamentModule {}
