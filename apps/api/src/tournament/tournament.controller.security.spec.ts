import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Player } from "../player/entities/player.entity";
import { RankingService } from "../ranking/ranking.service";
import { Tournament } from "./entities/tournament.entity";
import { TournamentOrganizer } from "./entities/tournament-organizer.entity";
import { TournamentRegistration } from "./entities/tournament-registration.entity";
import { TournamentOrganizerGuard } from "./guards/tournament-organizer.guard";
import { TournamentOwnerGuard } from "./guards/tournament-owner.guard";
import { TournamentParticipantGuard } from "./guards/tournament-participant.guard";
import { TournamentDeckSnapshotService } from "./services/tournament-deck-snapshot.service";
import { TournamentIncidentService } from "./services/tournament-incident.service";
import { TournamentRoundClockService } from "./services/tournament-round-clock.service";
import { TournamentController } from "./tournament.controller";
import { TournamentService } from "./tournament.service";

describe("TournamentController Security", () => {
  let controller: TournamentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentController],
      providers: [
        {
          provide: TournamentService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            registerPlayer: jest.fn(),
            unregisterPlayer: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: RankingService,
          useValue: {
            getExplainableStandings: jest.fn(),
            getTournamentRankings: jest.fn(),
          },
        },
        {
          provide: TournamentDeckSnapshotService,
          useValue: {
            submitDeckSnapshot: jest.fn(),
            getDeckSnapshot: jest.fn(),
          },
        },
        {
          provide: TournamentRoundClockService,
          useValue: {
            getClockStatus: jest.fn(),
            controlClock: jest.fn(),
          },
        },
        {
          provide: TournamentIncidentService,
          useValue: {
            dropPlayer: jest.fn(),
            previewScoreCorrection: jest.fn(),
            applyScoreCorrection: jest.fn(),
            getPlayerDashboard: jest.fn(),
          },
        },
        {
          provide: TournamentOrganizerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: TournamentParticipantGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: TournamentOwnerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TournamentOrganizer),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Player),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TournamentController>(TournamentController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should have security guards applied", () => {
    // Verify that guards are properly applied
    const controllerMetadata = Reflect.getMetadata(
      "__guards__",
      TournamentController,
    ) as unknown;
    expect(controllerMetadata).toBeDefined();
  });

  it("should protect global check-in with the organizer guard", () => {
    const guards = Reflect.getMetadata(
      "__guards__",
      TournamentController.prototype.checkInAllPlayers,
    ) as unknown[];

    expect(guards).toContain(TournamentOrganizerGuard);
  });
});
