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

  it('should validate active user', async () => {
    const strategy = new JwtStrategy(mockConfig, mockUserService);
    mockUserService.findById = jest.fn().mockResolvedValue({ id: 1, isActive: true });

    const result = await strategy.validate({ sub: 1 } as any);
    expect(result).toEqual({ id: 1, isActive: true });
  });

  it('should throw on inactive user', async () => {
    const strategy = new JwtStrategy(mockConfig, mockUserService);
    mockUserService.findById = jest.fn().mockResolvedValue({ id: 1, isActive: false });

    await expect(strategy.validate({ sub: 1 } as any)).rejects.toThrow(
      UnauthorizedException
    );
  });
});
