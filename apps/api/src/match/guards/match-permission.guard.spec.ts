import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchPermissionGuard } from './match-permission.guard';
import { Match } from '../entities/match.entity';
import { TournamentOrganizer } from '../../tournament/entities/tournament-organizer.entity';
import { UserRole } from 'src/common/enums/user';

const createContext = (req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req
    })
  } as unknown as ExecutionContext);

describe('MatchPermissionGuard', () => {
  let guard: MatchPermissionGuard;
  const matchRepo = { findOne: jest.fn() };
  const orgRepo = { findOne: jest.fn() };

  beforeEach(() => {
    guard = new MatchPermissionGuard(
      matchRepo as any,
      orgRepo as any
    );
    jest.clearAllMocks();
  });

  it('should allow admin users', async () => {
    const ctx = createContext({
      user: { id: 1, role: UserRole.ADMIN },
      params: { id: '10' }
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should throw forbidden when no user or id', async () => {
    const ctx = createContext({ user: null, params: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow organizers', async () => {
    matchRepo.findOne.mockResolvedValue({
      id: 10,
      tournament: { id: 5 },
      playerA: { user: { id: 2 } },
      playerB: { user: { id: 3 } }
    });
    orgRepo.findOne.mockResolvedValue({ id: 99 });
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '10' }
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should allow players to report score only', async () => {
    matchRepo.findOne.mockResolvedValue({
      id: 10,
      tournament: { id: 5 },
      playerA: { user: { id: 1 } },
      playerB: { user: { id: 3 } }
    });
    orgRepo.findOne.mockResolvedValue(null);
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '10' },
      route: { path: '/report-score' }
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should block players for non-report actions', async () => {
    matchRepo.findOne.mockResolvedValue({
      id: 10,
      tournament: { id: 5 },
      playerA: { user: { id: 1 } },
      playerB: { user: { id: 3 } }
    });
    orgRepo.findOne.mockResolvedValue(null);
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '10' },
      route: { path: '/reset' }
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('should throw when match not found', async () => {
    matchRepo.findOne.mockResolvedValue(null);
    const ctx = createContext({
      user: { id: 1, role: UserRole.USER },
      params: { id: '10' }
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });
});
