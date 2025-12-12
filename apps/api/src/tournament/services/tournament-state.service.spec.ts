import { BadRequestException } from '@nestjs/common';
import { TournamentStateService } from './tournament-state.service';
import { Tournament, TournamentStatus, TournamentType } from '../entities/tournament.entity';
import { TournamentRegistration, RegistrationStatus } from '../entities/tournament-registration.entity';
import { Match, MatchStatus } from '../../match/entities/match.entity';

const mockTournamentRepository = {
  findOne: jest.fn()
};
const mockRegistrationRepository = {
  find: jest.fn(),
  count: jest.fn()
};
const mockMatchRepository = {
  count: jest.fn()
};

const tournamentBase = (): Tournament =>
  ({
    id: 1,
    name: 'T',
    description: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    status: TournamentStatus.DRAFT,
    registrationDeadline: new Date(Date.now() + 10_000),
    minPlayers: 2,
    maxPlayers: 4,
    registrations: [],
    matches: [],
    type: TournamentType.SINGLE_ELIMINATION,
    currentRound: 1,
    totalRounds: 1,
    rewards: [],
    pricing: {} as any,
    organizers: [],
    rankings: []
  } as unknown as Tournament);

describe('TournamentStateService', () => {
  let service: TournamentStateService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TournamentStateService(
      mockTournamentRepository as any,
      mockRegistrationRepository as any,
      mockMatchRepository as any
    );
  });

  describe('validateStateTransition', () => {
    it('returns not found when tournament missing', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      const result = await service.validateStateTransition(1, TournamentStatus.IN_PROGRESS);
      expect(result.canTransition).toBe(false);
    });

    it('validates allowed transition with warnings', async () => {
      const t = tournamentBase();
      t.status = TournamentStatus.REGISTRATION_CLOSED;
      t.minPlayers = 1;
      t.currentRound = 1;
      t.totalRounds = 1;
      t.type = TournamentType.SINGLE_ELIMINATION;
      t.registrations = [{ status: RegistrationStatus.CONFIRMED, checkedIn: true } as TournamentRegistration];
      t.matches = [{ round: 1, status: MatchStatus.FINISHED } as Match];
      mockTournamentRepository.findOne.mockResolvedValue(t);
      mockRegistrationRepository.count.mockResolvedValue(1);
      mockMatchRepository.count.mockResolvedValue(0);
      const result = await service.validateStateTransition(1, TournamentStatus.IN_PROGRESS);
      expect(result.canTransition).toBe(true);
    });

    it('adds warning when tournament is almost full', async () => {
      const t = tournamentBase();
      t.status = TournamentStatus.REGISTRATION_CLOSED;
      t.maxPlayers = 10;
      t.minPlayers = 2;
      mockTournamentRepository.findOne.mockResolvedValue(t);

      // Satisfy transition conditions
      mockRegistrationRepository.count.mockResolvedValue(9);
      mockRegistrationRepository.find.mockResolvedValue([
        { status: RegistrationStatus.CONFIRMED, checkedIn: true } as any
      ]);

      const result = await service.validateStateTransition(
        1,
        TournamentStatus.IN_PROGRESS
      );
      expect(result.canTransition).toBe(true);
      expect(result.warnings).toContain('Le tournoi est presque complet');
    });

    it('fails DRAFT -> REGISTRATION_OPEN when required fields are missing', async () => {
      const t = tournamentBase();
      t.status = TournamentStatus.DRAFT;
      t.registrationDeadline = undefined as any;
      t.minPlayers = undefined as any;
      mockTournamentRepository.findOne.mockResolvedValue(t);

      const result = await service.validateStateTransition(
        1,
        TournamentStatus.REGISTRATION_OPEN
      );
      expect(result.canTransition).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid transition', async () => {
      const t = tournamentBase();
      t.status = TournamentStatus.DRAFT;
      mockTournamentRepository.findOne.mockResolvedValue(t);
      const result = await service.validateStateTransition(1, TournamentStatus.FINISHED);
      expect(result.canTransition).toBe(false);
    });
  });

  describe('transitionState', () => {
    it('throws when validation fails', async () => {
      jest.spyOn(service, 'validateStateTransition').mockResolvedValue({
        canTransition: false,
        errors: ['bad'],
        warnings: []
      });
      await expect(service.transitionState(1, TournamentStatus.FINISHED)).rejects.toThrow(
        BadRequestException
      );
    });

    it('changes state and executes actions', async () => {
      const t = tournamentBase();
      mockTournamentRepository.findOne.mockResolvedValue(t);
      jest.spyOn(service, 'validateStateTransition').mockResolvedValue({
        canTransition: true,
        errors: [],
        warnings: []
      });
      mockTournamentRepository.findOne.mockResolvedValueOnce(t);
      const saved = { ...t, status: TournamentStatus.FINISHED };
      (mockTournamentRepository as any).save = jest.fn().mockResolvedValue(saved);

      const result = await service.transitionState(1, TournamentStatus.FINISHED, 'end');
      expect(result.status).toBe(TournamentStatus.FINISHED);
    });

    it('throws if tournament is missing after successful validation', async () => {
      jest.spyOn(service, 'validateStateTransition').mockResolvedValue({
        canTransition: true,
        errors: [],
        warnings: []
      });
      mockTournamentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.transitionState(1, TournamentStatus.CANCELLED)
      ).rejects.toThrow(BadRequestException);
    });

    it('appends cancellation reason during CANCELLED transition', async () => {
      const t = tournamentBase();
      t.status = TournamentStatus.REGISTRATION_OPEN;
      t.additionalInfo = 'Some info';

      jest.spyOn(service, 'validateStateTransition').mockResolvedValue({
        canTransition: true,
        errors: [],
        warnings: []
      });

      mockTournamentRepository.findOne.mockResolvedValueOnce(t);
      (mockTournamentRepository as any).save = jest
        .fn()
        .mockImplementation(async (tt: any) => tt);

      const result = await service.transitionState(
        1,
        TournamentStatus.CANCELLED,
        'because'
      );
      expect(result.status).toBe(TournamentStatus.CANCELLED);
      expect(result.additionalInfo).toContain('Annulé: because');
    });
  });

  describe('getStateHistory', () => {
    it('returns available transitions and descriptions', async () => {
      const t = tournamentBase();
      t.status = TournamentStatus.DRAFT;
      mockTournamentRepository.findOne.mockResolvedValue(t);
      const history = await service.getStateHistory(1);
      expect(history.availableTransitions.length).toBeGreaterThan(0);
      expect(history.transitionDescriptions[history.availableTransitions[0]]).toBeDefined();
    });

    it('throws when tournament not found', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.getStateHistory(2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('helper behaviors', () => {
    it('considers check-in requirement when checking players', async () => {
      const t = tournamentBase();
      t.additionalInfo = 'check-in-required';
      mockRegistrationRepository.find.mockResolvedValue([
        { status: RegistrationStatus.CONFIRMED, checkedIn: false } as any
      ]);
      const result = await (service as any).allRequiredPlayersCheckedIn(t);
      expect(result).toBe(false);
    });

    it('returns true for check-in when not required', async () => {
      const t = tournamentBase();
      t.additionalInfo = '';
      const result = await (service as any).allRequiredPlayersCheckedIn(t);
      expect(result).toBe(true);
    });

    it('allMatchesCompleted returns false when scheduled matches remain', async () => {
      const t = tournamentBase();
      mockMatchRepository.count.mockResolvedValue(1);
      const result = await (service as any).allMatchesCompleted(t);
      expect(result).toBe(false);
    });

    it('isLastRoundCompleted returns false when current/total rounds are missing', async () => {
      const t = tournamentBase();
      t.currentRound = undefined as any;
      t.totalRounds = undefined as any;
      const result = await (service as any).isLastRoundCompleted(t);
      expect(result).toBe(false);
    });

    it('returns "Transition inconnue" for unknown transition description', () => {
      const desc = service.getTransitionDescription(
        TournamentStatus.FINISHED,
        TournamentStatus.REGISTRATION_OPEN
      );
      expect(desc).toBe('Transition inconnue');
    });

    it('verifies last round completion for elimination', async () => {
      const t = tournamentBase();
      t.type = TournamentType.SINGLE_ELIMINATION;
      t.currentRound = 1;
      t.totalRounds = 1;
      mockRegistrationRepository.count.mockResolvedValue(1);
      const finished = await (service as any).isLastRoundCompleted(t);
      expect(finished).toBe(true);
    });
  });
});
