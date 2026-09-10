import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { OAuthProvider } from "../entities/auth-identity.entity";
import { OAuthService } from "./oauth.service";

describe("OAuthService", () => {
  let service: OAuthService;
  let mockIdentityRepo: any;
  let mockUserRepo: any;
  let mockPlayerRepo: any;
  let mockCollectionRepo: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockIdentityRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve({ id: 1, ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest
        .fn()
        .mockImplementation((d) => Promise.resolve({ id: 10, ...d })),
    };
    mockPlayerRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue({ id: 20 }),
    };
    mockCollectionRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue({ id: 30 }),
    };
    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          findOne: mockUserRepo.findOne,
          create: jest.fn().mockImplementation((_, d) => d),
          save: jest
            .fn()
            .mockImplementation((_, d) => Promise.resolve({ id: 99, ...d })),
        };
        return cb(manager);
      }),
    };

    service = new OAuthService(
      mockIdentityRepo,
      mockUserRepo,
      mockPlayerRepo,
      mockCollectionRepo,
      mockDataSource,
    );
  });

  describe("validateReturnTo", () => {
    it("accepts valid local application routes", () => {
      expect(service.validateReturnTo("/dashboard")).toBe("/dashboard");
      expect(service.validateReturnTo("/fr/decks")).toBe("/fr/decks");
      expect(service.validateReturnTo("/collection")).toBe("/collection");
    });

    it("rejects external or malicious returnTo URLs", () => {
      expect(service.validateReturnTo("https://evil.com")).toBe("/");
      expect(service.validateReturnTo("//evil.com")).toBe("/");
      expect(service.validateReturnTo("/\\evil.com")).toBe("/");
      expect(service.validateReturnTo("/unauthorized/admin")).toBe("/");
    });
  });

  describe("generatePkce", () => {
    it("generates valid code_verifier and code_challenge", () => {
      const { codeVerifier, codeChallenge } = service.generatePkce();
      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
      expect(codeVerifier.length).toBeGreaterThan(30);
      expect(codeChallenge.length).toBeGreaterThan(30);
    });
  });

  describe("getAuthorizationUrl", () => {
    it("builds valid Google OAuth consent URL with S256 PKCE", () => {
      const url = service.getAuthorizationUrl(
        OAuthProvider.GOOGLE,
        "state123",
        "challenge456",
        "nonce789",
        "http://localhost:3001/api/auth/oauth/google/callback",
      );

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("state=state123");
      expect(url).toContain("code_challenge=challenge456");
      expect(url).toContain("code_challenge_method=S256");
      expect(url).toContain("nonce=nonce789");
    });

    it("throws BadRequestException for unsupported providers", () => {
      expect(() =>
        service.getAuthorizationUrl(
          "unsupported" as any,
          "s",
          "c",
          "n",
          "http://cb",
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe("resolveOrCreateUser", () => {
    it("returns existing user when identity is already linked", async () => {
      mockIdentityRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 42, email: "existing@example.com", isActive: true },
      });

      const user = await service.resolveOrCreateUser({
        provider: OAuthProvider.GOOGLE,
        providerSubject: "sub123",
        email: "existing@example.com",
        emailVerified: true,
      });

      expect(user.id).toBe(42);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when linked user is disabled", async () => {
      mockIdentityRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 42, isActive: false },
      });

      await expect(
        service.resolveOrCreateUser({
          provider: OAuthProvider.GOOGLE,
          providerSubject: "sub123",
          email: "disabled@example.com",
          emailVerified: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("creates a new user and identity inside transaction for new subject", async () => {
      mockIdentityRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue(null);

      const user = await service.resolveOrCreateUser({
        provider: OAuthProvider.GOOGLE,
        providerSubject: "new_sub_999",
        email: "new_user@example.com",
        emailVerified: true,
        firstName: "New",
        lastName: "User",
      });

      expect(user).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe("unlinkIdentity", () => {
    it("allows unlinking when user has a password", async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        password: "hashedpassword",
        identities: [{ id: 10, provider: OAuthProvider.GOOGLE }],
      });

      await expect(
        service.unlinkIdentity(1, OAuthProvider.GOOGLE),
      ).resolves.toBeUndefined();
      expect(mockIdentityRepo.delete).toHaveBeenCalledWith({ id: 10 });
    });

    it("prevents unlinking the sole authentication method when user has no password", async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        password: null,
        identities: [{ id: 10, provider: OAuthProvider.GOOGLE }],
      });

      await expect(
        service.unlinkIdentity(1, OAuthProvider.GOOGLE),
      ).rejects.toThrow(ConflictException);
    });
  });
});
