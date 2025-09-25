import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../user/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user })
      }),
      getHandler: () => (function handler() {}) as any,
      getClass: () => (class TestClass {}) as any
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('autorise si aucun rôle requis', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined as any);
    const ctx = createContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("refuse si rôle requis et utilisateur ne l'a pas", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN] as any);
    const ctx = createContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('autorise si rôle correspond', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MODERATOR] as any);
    const ctx = createContext({ role: UserRole.MODERATOR });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("autorise 'pro' si user.isPro = true", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['pro'] as any);
    const ctx = createContext({ role: UserRole.USER, isPro: true });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("refuse 'pro' si user.isPro = false", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['pro'] as any);
    const ctx = createContext({ role: UserRole.USER, isPro: false });
    expect(guard.canActivate(ctx)).toBe(false);
  });
});


