import { ExecutionContext } from '@nestjs/common';
import { TournamentParticipantGuard } from './tournament-participant.guard';
import { RegistrationStatus } from '../entities/tournament-registration.entity';

const ctx = (req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req
    })
  } as unknown as ExecutionContext);

describe('TournamentParticipantGuard', () => {
  const registrationRepo = { findOne: jest.fn() };
  const tournamentRepo = { findOne: jest.fn() };
  const playerRepo = { findOne: jest.fn() };
  let guard: TournamentParticipantGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new TournamentParticipantGuard(
      registrationRepo as any,
      tournamentRepo as any,
      playerRepo as any
    );
  });

  it('should throw when tournament missing', async () => {
    tournamentRepo.findOne.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ user: { id: 1 }, params: { id: '1' } }))
    ).rejects.toThrow('Tournoi non trouvé');
  });

  it('should validate with playerId provided', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    playerRepo.findOne.mockResolvedValueOnce({ id: 5, user: { id: 1 } });
    registrationRepo.findOne.mockResolvedValueOnce({
      id: 9,
      status: RegistrationStatus.CONFIRMED
    });
    const req: any = { user: { id: 1 }, params: { id: '2', playerId: '5' } };

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.tournamentPlayer.id).toBe(5);
  });

  it('should throw when player not owned', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    playerRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      guard.canActivate(ctx({ user: { id: 1 }, params: { id: '2', playerId: '5' } }))
    ).rejects.toThrow('Ce joueur ne vous appartient pas');
  });

  it('should throw when registration missing for playerId', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    playerRepo.findOne.mockResolvedValueOnce({ id: 5, user: { id: 1 } });
    registrationRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      guard.canActivate(ctx({ user: { id: 1 }, params: { id: '2', playerId: '5' } }))
    ).rejects.toThrow("Ce joueur n'est pas inscrit à ce tournoi");
  });

  it('should validate when auto-selecting first player', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    playerRepo.findOne.mockResolvedValueOnce({ id: 7, user: { id: 1 } });
    registrationRepo.findOne.mockResolvedValueOnce({
      id: 11,
      status: RegistrationStatus.CONFIRMED
    });
    const req: any = { user: { id: 1 }, params: { id: '2' } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.tournamentPlayer.id).toBe(7);
  });

  it('should throw when user has no player profile', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    playerRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      guard.canActivate(ctx({ user: { id: 1 }, params: { id: '2' } }))
    ).rejects.toThrow('Vous devez avoir un profil joueur pour participer');
  });

  it('should throw when registration missing without playerId', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    playerRepo.findOne.mockResolvedValueOnce({ id: 7, user: { id: 1 } });
    registrationRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      guard.canActivate(ctx({ user: { id: 1 }, params: { id: '2' } }))
    ).rejects.toThrow("Vous n'êtes pas inscrit à ce tournoi");
  });
});
