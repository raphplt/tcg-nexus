import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { UserService } from '../../user/user.service';

describe('JwtRefreshStrategy', () => {
  const mockConfig = {
    get: jest.fn().mockReturnValue('refreshSecret')
  } as unknown as ConfigService;
  const mockUserService = {
    findById: jest.fn()
  } as unknown as UserService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw if refresh secret missing', () => {
    const badConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
    expect(() => new JwtRefreshStrategy(badConfig, mockUserService)).toThrow(
      'JWT_REFRESH_SECRET must be defined in environment variables'
    );
  });

  it('should validate and attach refresh token', async () => {
    const strategy = new JwtRefreshStrategy(mockConfig, mockUserService);
    mockUserService.findById = jest
      .fn()
      .mockResolvedValue({ id: 1, isActive: true });

    const req = { cookies: { refreshToken: 'rt' } } as any;
    const result = await strategy.validate(req, { sub: 1 } as any);

    expect(result.refreshToken).toBe('rt');
  });

  it('should throw on inactive user', async () => {
    const strategy = new JwtRefreshStrategy(mockConfig, mockUserService);
    mockUserService.findById = jest
      .fn()
      .mockResolvedValue({ id: 1, isActive: false });

    await expect(
      strategy.validate({ cookies: {} } as any, { sub: 1 } as any)
    ).rejects.toThrow(UnauthorizedException);
  });
});
