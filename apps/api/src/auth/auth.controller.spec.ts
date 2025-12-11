import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CollectionService } from '../collection/collection.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        },
        {
          provide: UserService,
          useValue: {}
        },
        {
          provide: JwtService,
          useValue: {}
        },
        {
          provide: ConfigService,
          useValue: {}
        },
        {
          provide: CollectionService,
          useValue: {}
        }
      ]
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true)
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login and set cookies', async () => {
    const res = {
      cookie: jest.fn(),
      json: jest.fn()
    } as any;
    const req = {
      headers: { 'x-remember-me': 'true' }
    } as any;
    mockAuthService.login.mockResolvedValue({
      user: { id: 1, email: 'a' },
      tokens: { accessToken: 'a', refreshToken: 'b' }
    });

    await controller.login({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ user: { id: 1, email: 'a' } });
  });

  it('should register and set cookies', async () => {
    const res = {
      cookie: jest.fn(),
      json: jest.fn()
    } as any;
    const req = {
      headers: { 'x-remember-me': 'false' }
    } as any;
    mockAuthService.register.mockResolvedValue({
      user: { id: 2, email: 'b' },
      tokens: { accessToken: 'c', refreshToken: 'd' }
    });

    await controller.register({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ user: { id: 2, email: 'b' } });
  });

  it('should refresh tokens and set cookies', async () => {
    const res = { cookie: jest.fn(), json: jest.fn() } as any;
    const req = { headers: { 'x-remember-me': 'true' } } as any;
    mockAuthService.refreshTokens.mockResolvedValue({
      accessToken: 'newAccess',
      refreshToken: 'newRefresh'
    });

    await controller.refreshTokens(
      { id: 1, refreshToken: 'stored' } as any,
      res,
      req
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should throw when no refresh token provided', async () => {
    const res = {} as any;
    const req = { headers: {} } as any;
    await expect(
      controller.refreshTokens({ id: 1 } as any, res, req)
    ).rejects.toThrow();
  });

  it('should logout and clear cookies', async () => {
    const res = {
      clearCookie: jest.fn(),
      json: jest.fn()
    } as any;
    const req = { headers: {} } as any;

    await controller.logout({ id: 1 } as any, res, req);

    expect(mockAuthService.logout).toHaveBeenCalledWith(1);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Logged out successfully'
    });
  });

  it('should return profile', () => {
    const user = {
      id: 3,
      email: 'user@test.com',
      firstName: 'First',
      lastName: 'Last',
      role: 'USER',
      isPro: false
    } as any;

    expect(controller.getProfile(user)).toEqual({
      id: 3,
      email: 'user@test.com',
      firstName: 'First',
      lastName: 'Last',
      role: 'USER',
      isPro: false
    });
  });
});
