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
    const cookies: any[] = [];
    const res = {
      cookie: jest.fn((...args) => cookies.push(args)),
      json: jest.fn()
    } as any;
    const req = {
      headers: { 'x-remember-me': 'true' },
      hostname: 'api.example.com'
    } as any;
    const prevFrontend = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://example.com';
    mockAuthService.login.mockResolvedValue({
      user: { id: 1, email: 'a' },
      tokens: { accessToken: 'a', refreshToken: 'b' }
    });

    await controller.login({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(cookies[0][2].domain).toBe('example.com');
    process.env.FRONTEND_URL = prevFrontend;
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

  it('should honor explicit cookie domain', async () => {
    const res = { cookie: jest.fn(), json: jest.fn() } as any;
    const req = { headers: {}, hostname: 'api.other.com' } as any;
    const originalDomain = process.env.COOKIE_DOMAIN;
    process.env.COOKIE_DOMAIN = 'example.org';
    mockAuthService.register.mockResolvedValue({
      user: { id: 3 },
      tokens: { accessToken: 'aa', refreshToken: 'bb' }
    });

    await controller.register({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'aa',
      expect.objectContaining({ domain: 'example.org' })
    );
    process.env.COOKIE_DOMAIN = originalDomain;
  });

  it('should fall back when FRONTEND_URL invalid', async () => {
    const res = { cookie: jest.fn(), json: jest.fn() } as any;
    const req = { headers: {}, hostname: 'api.example.com' } as any;
    const prevFrontend = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = '::not-a-url';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAuthService.login.mockResolvedValue({
      user: { id: 4 },
      tokens: { accessToken: 'aa', refreshToken: 'bb' }
    });

    await controller.login({} as any, res, req);

    const firstCallOptions = res.cookie.mock.calls[0][2];
    expect(
      firstCallOptions.domain === undefined ||
        firstCallOptions.domain === 'undefined'
    ).toBe(true);
    process.env.FRONTEND_URL = prevFrontend;
    errorSpy.mockRestore();
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
