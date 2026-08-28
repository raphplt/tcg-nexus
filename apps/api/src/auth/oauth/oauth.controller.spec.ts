import { OAuthProvider } from "../entities/auth-identity.entity";
import { OAuthController } from "./oauth.controller";

describe("OAuthController", () => {
  let controller: OAuthController;
  let mockOAuthService: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockOAuthService = {
      getEnabledProviders: jest.fn().mockReturnValue([OAuthProvider.GOOGLE]),
      validateReturnTo: jest.fn().mockReturnValue("/dashboard"),
      generatePkce: jest.fn().mockReturnValue({
        codeVerifier: "verifier123",
        codeChallenge: "challenge123",
      }),
      generateRandomString: jest.fn().mockReturnValue("rand123"),
      getAuthorizationUrl: jest
        .fn()
        .mockReturnValue("https://accounts.google.com/auth"),
      exchangeGoogleCode: jest.fn().mockResolvedValue({
        provider: OAuthProvider.GOOGLE,
        providerSubject: "sub123",
        email: "user@example.com",
        emailVerified: true,
      }),
      resolveOrCreateUser: jest.fn().mockResolvedValue({
        id: 1,
        email: "user@example.com",
        role: "user",
      }),
      getUserIdentities: jest
        .fn()
        .mockResolvedValue([{ id: 1, provider: "google" }]),
      unlinkIdentity: jest.fn().mockResolvedValue(undefined),
    };

    mockAuthService = {
      generateTokens: jest.fn().mockResolvedValue({
        accessToken: "acc_token",
        refreshToken: "ref_token",
        accessTokenExpiresAt: "2026-08-28T00:00:00.000Z",
      }),
      getAccessTokenTtlMs: jest.fn().mockReturnValue(900000),
      getRefreshTokenTtlMs: jest.fn().mockReturnValue(604800000),
    };

    controller = new OAuthController(mockOAuthService, mockAuthService);
  });

  it("getProviders returns list of active providers", () => {
    const res = controller.getProviders();
    expect(res.providers).toEqual([OAuthProvider.GOOGLE]);
  });

  it("startOAuth sets cookie and redirects to provider consent URL", async () => {
    const mockReq: any = { protocol: "http", get: () => "localhost:3001" };
    const mockRes: any = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.startOAuth("google", "/dashboard", mockReq, mockRes);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      "oauth_tx",
      expect.any(String),
      expect.any(Object),
    );
    expect(mockRes.redirect).toHaveBeenCalledWith(
      "https://accounts.google.com/auth",
    );
  });

  it("handleCallback verifies state, sets session cookies and redirects to destination", async () => {
    const mockReq: any = {
      protocol: "http",
      get: () => "localhost:3001",
      cookies: {
        oauth_tx: JSON.stringify({
          provider: "google",
          state: "state123",
          nonce: "nonce123",
          codeVerifier: "verifier123",
          returnTo: "/dashboard",
        }),
      },
    };
    const mockRes: any = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.handleCallback(
      "google",
      "code123",
      "state123",
      undefined,
      mockReq,
      mockRes,
    );

    expect(mockRes.cookie).toHaveBeenCalledWith(
      "accessToken",
      "acc_token",
      expect.any(Object),
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "ref_token",
      expect.any(Object),
    );
    expect(mockRes.clearCookie).toHaveBeenCalledWith("oauth_tx", {
      path: "/api/auth/oauth",
    });
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard"),
    );
  });

  it("exchangeMobileCode exchanges PKCE code and returns session tokens in JSON", async () => {
    const res = await controller.exchangeMobileCode("google", {
      code: "code123",
      codeVerifier: "verifier123",
      redirectUri: "tcgnexus://auth/callback",
    });

    expect(res.user.email).toBe("user@example.com");
    expect(res.tokens.accessToken).toBe("acc_token");
  });
});
