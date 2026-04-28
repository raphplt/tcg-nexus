import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CollectionService } from "../collection/collection.service";
import { UserService } from "../user/user.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;

  const ACCESS_TTL = 15 * 60 * 1000;
  const REFRESH_TTL = 30 * 24 * 60 * 60 * 1000;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    getAccessTokenTtlMs: jest.fn(() => ACCESS_TTL),
    getRefreshTokenTtlMs: jest.fn(() => REFRESH_TTL),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UserService,
          useValue: {
            findOne: jest.fn((id: number) => ({
              id,
              email: "user@test.com",
              firstName: "First",
              lastName: "Last",
              role: "USER",
              isPro: false,
            })),
          },
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: CollectionService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should login and set cookies", async () => {
    const cookies: any[] = [];
    const res = {
      cookie: jest.fn((...args) => cookies.push(args)),
      json: jest.fn(),
    } as any;
    const req = {
      headers: { "x-remember-me": "true" },
      hostname: "api.example.com",
    } as any;
    const prevFrontend = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = "https://example.com";
    mockAuthService.login.mockResolvedValue({
      user: { id: 1, email: "a" },
      tokens: { accessToken: "a", refreshToken: "b", accessTokenExpiresAt: 42 },
    });

    await controller.login({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(cookies[0][2].domain).toBe("example.com");
    // rememberMe=true → cookie refreshToken doit utiliser le TTL refresh
    expect(cookies[1][2].maxAge).toBe(REFRESH_TTL);
    process.env.FRONTEND_URL = prevFrontend;
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, email: "a" },
      accessTokenExpiresAt: 42,
    });
  });

  it("should register and set cookies", async () => {
    const cookies: any[] = [];
    const res = {
      cookie: jest.fn((...args) => cookies.push(args)),
      json: jest.fn(),
    } as any;
    const req = {
      headers: { "x-remember-me": "false" },
    } as any;
    mockAuthService.register.mockResolvedValue({
      user: { id: 2, email: "b" },
      tokens: { accessToken: "c", refreshToken: "d", accessTokenExpiresAt: 99 },
    });

    await controller.register({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledTimes(2);
    // rememberMe=false → cookie refreshToken doit être un cookie de session (pas de maxAge)
    expect(cookies[1][2].maxAge).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith({
      user: { id: 2, email: "b" },
      accessTokenExpiresAt: 99,
    });
  });

  it("should honor explicit cookie domain", async () => {
    const res = { cookie: jest.fn(), json: jest.fn() } as any;
    const req = { headers: {}, hostname: "api.other.com" } as any;
    const originalDomain = process.env.COOKIE_DOMAIN;
    process.env.COOKIE_DOMAIN = "example.org";
    mockAuthService.register.mockResolvedValue({
      user: { id: 3 },
      tokens: {
        accessToken: "aa",
        refreshToken: "bb",
        accessTokenExpiresAt: 1,
      },
    });

    await controller.register({} as any, res, req);

    expect(res.cookie).toHaveBeenCalledWith(
      "accessToken",
      "aa",
      expect.objectContaining({ domain: "example.org" }),
    );
    process.env.COOKIE_DOMAIN = originalDomain;
  });

  it("should fall back when FRONTEND_URL invalid", async () => {
    const res = { cookie: jest.fn(), json: jest.fn() } as any;
    const req = { headers: {}, hostname: "api.example.com" } as any;
    const prevFrontend = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = "::not-a-url";
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockAuthService.login.mockResolvedValue({
      user: { id: 4 },
      tokens: {
        accessToken: "aa",
        refreshToken: "bb",
        accessTokenExpiresAt: 7,
      },
    });

    await controller.login({} as any, res, req);

    const firstCallOptions = res.cookie.mock.calls[0][2];
    expect(
      firstCallOptions.domain === undefined ||
        firstCallOptions.domain === "undefined",
    ).toBe(true);
    process.env.FRONTEND_URL = prevFrontend;
    errorSpy.mockRestore();
  });

  it("should refresh tokens and set cookies", async () => {
    const res = { cookie: jest.fn(), json: jest.fn() } as any;
    const req = { headers: { "x-remember-me": "true" } } as any;
    mockAuthService.refreshTokens.mockResolvedValue({
      accessToken: "newAccess",
      refreshToken: "newRefresh",
      accessTokenExpiresAt: 123,
    });

    await controller.refreshTokens(
      { id: 1, refreshToken: "stored" } as any,
      res,
      req,
    );

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      accessTokenExpiresAt: 123,
    });
  });

  it("should throw when no refresh token provided", async () => {
    const res = {} as any;
    const req = { headers: {} } as any;
    await expect(
      controller.refreshTokens({ id: 1 } as any, res, req),
    ).rejects.toThrow();
  });

  it("should logout and clear cookies", async () => {
    const res = {
      clearCookie: jest.fn(),
      json: jest.fn(),
    } as any;
    const req = { headers: {} } as any;

    await controller.logout({ id: 1 } as any, res, req);

    expect(mockAuthService.logout).toHaveBeenCalledWith(1);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      message: "Logged out successfully",
    });
  });

  it("should return profile", () => {
    const user = {
      id: 3,
      email: "user@test.com",
      firstName: "First",
      lastName: "Last",
      role: "USER",
      isPro: false,
    } as any;

    expect(controller.getProfile(user)).toEqual({
      id: 3,
      email: "user@test.com",
      firstName: "First",
      lastName: "Last",
      role: "USER",
      isPro: false,
    });
  });
});
