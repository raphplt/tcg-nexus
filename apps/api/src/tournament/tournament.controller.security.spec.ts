import { Test, TestingModule } from '@nestjs/testing';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TournamentOrganizerGuard } from './guards/tournament-organizer.guard';
import { TournamentParticipantGuard } from './guards/tournament-participant.guard';
import { TournamentOwnerGuard } from './guards/tournament-owner.guard';

describe('TournamentController Security', () => {
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
            remove: jest.fn()
          }
        },
        {
          provide: TournamentOrganizerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true)
          }
        },
        {
          provide: TournamentParticipantGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true)
          }
        },
        {
          provide: TournamentOwnerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true)
          }
        }
      ]
    }).compile();

    controller = module.get<TournamentController>(TournamentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have security guards applied', () => {
    // Vérifier que les guards sont bien appliqués
    const controllerMetadata = Reflect.getMetadata(
      '__guards__',
      TournamentController
    ) as unknown;
    expect(controllerMetadata).toBeDefined();
  });
});
