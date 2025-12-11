import { ExecutionContext } from '@nestjs/common';
import { TournamentOwnerGuard } from './tournament-owner.guard';
import { UserRole } from 'src/common/enums/user';
import { OrganizerRole } from '../entities/tournament-organizer.entity';

const ctx = (req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req
    })
  } as unknown as ExecutionContext);

describe('TournamentOwnerGuard', () => {
  const organizerRepo = { findOne: jest.fn() };
  const tournamentRepo = { findOne: jest.fn() };
  let guard: TournamentOwnerGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new TournamentOwnerGuard(organizerRepo as any, tournamentRepo as any);
  });

  it('should allow admin', async () => {
    const req = { user: { id: 1, role: UserRole.ADMIN }, params: { id: '2' } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
  });

  it('should throw when tournament not found', async () => {
    tournamentRepo.findOne.mockResolvedValue(null);
    const req = { user: { id: 1, role: UserRole.USER }, params: { id: '2' } };
    await expect(guard.canActivate(ctx(req))).rejects.toThrow('Tournoi non trouvé');
  });

  it('should throw when not owner', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    organizerRepo.findOne.mockResolvedValue(null);
    const req = { user: { id: 1, role: UserRole.USER }, params: { id: '2' } };
    await expect(guard.canActivate(ctx(req))).rejects.toThrow(
      "Vous n'êtes pas propriétaire de ce tournoi"
    );
  });

  it('should allow owner', async () => {
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    organizerRepo.findOne.mockResolvedValue({
      id: 3,
      role: OrganizerRole.OWNER,
      user: { id: 1 }
    });
    const req: any = { user: { id: 1, role: UserRole.USER }, params: { id: '2' } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.tournamentOrganizer.role).toBe(OrganizerRole.OWNER);
    expect(req.tournament.id).toBe(2);
  });
});
