import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '../../user/user.service';

describe('JwtStrategy', () => {
  const mockConfig = {
    get: jest.fn().mockReturnValue('secret')
  } as unknown as ConfigService;
  const mockUserService = {
    findById: jest.fn()
  } as unknown as UserService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw if JWT_SECRET is missing', () => {
    const badConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
    expect(() => new JwtStrategy(badConfig, mockUserService)).toThrow(
      'JWT_SECRET must be defined in environment variables'
    );
  });

  it('should extract token from cookies', () => {
    const strategy = new JwtStrategy(mockConfig, mockUserService);
    const token = (strategy as any)._jwtFromRequest({
      cookies: { accessToken: 'abc' }
    });
    expect(token).toBe('abc');
    const empty = (strategy as any)._jwtFromRequest({});
    expect(empty).toBeNull();
  });

  it('should validate active user', async () => {
    const strategy = new JwtStrategy(mockConfig, mockUserService);
    mockUserService.findById = jest
      .fn()
      .mockResolvedValue({ id: 1, isActive: true });

    const result = await strategy.validate({ sub: 1 } as any);
    expect(result).toEqual({ id: 1, isActive: true });
  });

  it('should throw on inactive user', async () => {
    const strategy = new JwtStrategy(mockConfig, mockUserService);
    mockUserService.findById = jest
      .fn()
      .mockResolvedValue({ id: 1, isActive: false });

    await expect(strategy.validate({ sub: 1 } as any)).rejects.toThrow(
      UnauthorizedException
    );
  });
});
