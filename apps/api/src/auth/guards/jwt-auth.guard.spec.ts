import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  const createMockContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn()
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn()
    } as unknown as Reflector;
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow public routes without calling super', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = createMockContext();
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should delegate to AuthGuard when route is protected', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const spy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as any);

    const ctx = createMockContext();
    const result = guard.canActivate(ctx);

    expect(spy).toHaveBeenCalledWith(ctx);
    expect(result).toBe(true);
  });
});
