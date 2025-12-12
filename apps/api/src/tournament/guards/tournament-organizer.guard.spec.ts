import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TournamentOrganizerGuard, TournamentOrganizerRoles } from './tournament-organizer.guard';
import { UserRole } from 'src/common/enums/user';

const createContext = (req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req
    }),
    getHandler: () => ({} as any),
    getClass: () => ({} as any)
  } as unknown as ExecutionContext);

describe('TournamentOrganizerGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn()
  } as unknown as Reflector;
  const organizerRepo = { findOne: jest.fn() };
  const tournamentRepo = { findOne: jest.fn() };
  let guard: TournamentOrganizerGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new TournamentOrganizerGuard(
      reflector,
      organizerRepo as any,
      tournamentRepo as any
    );
  });

  it('should allow when no roles required', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(
      guard.canActivate(createContext({ user: { id: 1 }, params: { id: '1' } }))
    ).resolves.toBe(true);
  });

  it('should allow admin or moderator', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ORGANIZER']);
    const ctx = createContext({
      user: { id: 1, role: UserRole.ADMIN },
      params: { id: '1' }
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should throw when tournament not found', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ORGANIZER']);
    tournamentRepo.findOne.mockResolvedValue(null);
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '2' }
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Tournoi non trouvé');
  });

  it('should throw when organizer missing', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ORGANIZER']);
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    organizerRepo.findOne.mockResolvedValue(null);
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '2' }
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      "Vous n'êtes pas organisateur de ce tournoi"
    );
  });

  it('should throw when role mismatches', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['OWNER']);
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    organizerRepo.findOne.mockResolvedValue({ id: 3, role: 'JUDGE', user: { id: 1 } });
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '2' }
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Rôle requis');
  });

  it('should allow organizer with required role', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['JUDGE']);
    tournamentRepo.findOne.mockResolvedValue({ id: 2 });
    organizerRepo.findOne.mockResolvedValue({
      id: 3,
      role: 'JUDGE',
      user: { id: 1 }
    });
    const req: any = { user: { id: 1, role: UserRole.USER }, params: { id: '2' } };
    const ctx = createContext(req);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.tournamentOrganizer.role).toBe('JUDGE');
    expect(req.tournament.id).toBe(2);
  });

  it('should throw when user or tournament id missing', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['OWNER']);
    const ctx = createContext({ user: null, params: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Utilisateur ou ID de tournoi manquant'
    );
  });
});
