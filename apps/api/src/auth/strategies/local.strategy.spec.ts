import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  const mockAuthService = {
    validateUser: jest.fn()
  } as unknown as AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when credentials valid', async () => {
    mockAuthService.validateUser = jest.fn().mockResolvedValue({ id: 1 });
    const strategy = new LocalStrategy(mockAuthService);

    await expect(strategy.validate('mail', 'pwd')).resolves.toEqual({ id: 1 });
  });

  it('should throw when credentials invalid', async () => {
    mockAuthService.validateUser = jest.fn().mockResolvedValue(null);
    const strategy = new LocalStrategy(mockAuthService);

    await expect(strategy.validate('mail', 'pwd')).rejects.toThrow(
      UnauthorizedException
    );
  });
});
