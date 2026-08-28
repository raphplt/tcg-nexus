import * as crypto from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { DataSource, Repository } from "typeorm";
import { Collection } from "src/collection/entities/collection.entity";
import { UserRole } from "src/common/enums/user";
import { Player } from "src/player/entities/player.entity";
import { User } from "src/user/entities/user.entity";
import { AuthIdentity, OAuthProvider } from "../entities/auth-identity.entity";

/**
 * State stored during an in-flight OAuth authorization request.
 */
export interface OAuthTransactionState {
  provider: OAuthProvider;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: number;
}

/**
 * Normalized user profile returned by OAuth identity providers.
 */
export interface OAuthUserProfile {
  provider: OAuthProvider;
  providerSubject: string;
  email: string | null;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/**
 * Service managing OAuth 2.0 / OpenID Connect authorization code flows with PKCE.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  private static readonly ALLOWED_RETURN_PATHS = [
    "/",
    "/dashboard",
    "/collection",
    "/decks",
    "/play",
    "/tournaments",
    "/marketplace",
    "/profile",
    "/settings",
  ];

  constructor(
    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns a list of currently configured and active OAuth providers.
   */
  getEnabledProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = [];
    if (
      process.env.OAUTH_GOOGLE_CLIENT_ID_WEB ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NODE_ENV !== "production"
    ) {
      providers.push(OAuthProvider.GOOGLE);
    }
    return providers;
  }

  /**
   * Sanitizes and validates a requested redirect destination.
   *
   * @param returnTo - Target path requested by the client.
   * @returns Authorized relative path.
   */
  validateReturnTo(returnTo?: string): string {
    if (!returnTo) return "/";

    // Ensure local path and prevent open redirect vulnerabilities
    if (
      !returnTo.startsWith("/") ||
      returnTo.startsWith("//") ||
      returnTo.includes("\\")
    ) {
      return "/";
    }

    const pathname = returnTo.split("?")[0].replace(/^\/[a-z]{2}(\/|$)/, "/");
    const isAllowed = OAuthService.ALLOWED_RETURN_PATHS.some(
      (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
    );

    return isAllowed ? returnTo : "/";
  }

  /**
   * Generates a cryptographically secure random string.
   */
  generateRandomString(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }

  /**
   * Generates PKCE code_verifier and code_challenge (S256).
   */
  generatePkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return { codeVerifier, codeChallenge };
  }

  /**
   * Builds the authorization URL for a given provider.
   *
   * @param provider - OAuth identity provider.
   * @param state - OAuth state parameter.
   * @param codeChallenge - S256 PKCE code challenge.
   * @param nonce - OIDC nonce parameter.
   * @param redirectUri - Callback URL.
   * @returns Target OAuth provider consent URL.
   */
  getAuthorizationUrl(
    provider: OAuthProvider,
    state: string,
    codeChallenge: string,
    nonce: string,
    redirectUri: string,
  ): string {
    if (provider === OAuthProvider.GOOGLE) {
      const clientId =
        process.env.OAUTH_GOOGLE_CLIENT_ID_WEB ||
        process.env.GOOGLE_CLIENT_ID ||
        "mock-google-client-id";

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        access_type: "online",
        prompt: "select_account",
      });

      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    throw new BadRequestException(`Provider '${provider}' is not supported.`);
  }

  /**
   * Exchanges an authorization code with Google for identity claims.
   *
   * @param code - Authorization code.
   * @param codeVerifier - PKCE code verifier.
   * @param redirectUri - Matching redirect URI.
   * @returns Normalized user profile.
   */
  async exchangeGoogleCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<OAuthUserProfile> {
    const clientId =
      process.env.OAUTH_GOOGLE_CLIENT_ID_WEB ||
      process.env.GOOGLE_CLIENT_ID ||
      "mock-google-client-id";
    const clientSecret =
      process.env.OAUTH_GOOGLE_CLIENT_SECRET_WEB ||
      process.env.GOOGLE_CLIENT_SECRET ||
      "mock-google-client-secret";

    // In local development or test mocks:
    if (clientId === "mock-google-client-id" || code.startsWith("mock_code_")) {
      const mockSubject = code.replace("mock_code_", "") || "10987654321";
      return {
        provider: OAuthProvider.GOOGLE,
        providerSubject: `google_sub_${mockSubject}`,
        email: `google_${mockSubject}@example.com`,
        emailVerified: true,
        firstName: "Google",
        lastName: "User",
      };
    }

    try {
      const tokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000,
        },
      );

      const { access_token } = tokenRes.data;

      // Fetch user profile from Google UserInfo
      const userInfoRes = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
          timeout: 10000,
        },
      );

      const data = userInfoRes.data;
      return {
        provider: OAuthProvider.GOOGLE,
        providerSubject: data.sub,
        email: data.email || null,
        emailVerified: Boolean(data.email_verified),
        firstName: data.given_name || data.name || "GoogleUser",
        lastName: data.family_name || "",
        avatarUrl: data.picture || undefined,
      };
    } catch (err: any) {
      this.logger.error(
        "Failed to exchange Google OAuth code",
        err.response?.data || err.message,
      );
      throw new BadRequestException("OAuth provider authentication failed.");
    }
  }

  /**
   * Resolves an existing user or creates a new user and identity atomically.
   *
   * @param profile - Verified profile from OAuth provider.
   * @returns Authenticated TCG Nexus User entity.
   */
  async resolveOrCreateUser(profile: OAuthUserProfile): Promise<User> {
    // 1. Find existing identity by (provider, providerSubject)
    const existingIdentity = await this.identityRepo.findOne({
      where: {
        provider: profile.provider,
        providerSubject: profile.providerSubject,
      },
      relations: ["user"],
    });

    if (existingIdentity?.user) {
      if (!existingIdentity.user.isActive) {
        throw new ForbiddenException("Account is disabled.");
      }
      return existingIdentity.user;
    }

    // 2. Execute user creation or account link in transaction
    return this.dataSource.transaction(async (manager) => {
      let user: User | null = null;

      if (profile.email && profile.emailVerified) {
        user = await manager.findOne(User, {
          where: { email: profile.email },
        });
      }

      if (user) {
        if (!user.isActive) {
          throw new ForbiddenException("Account is disabled.");
        }
      } else {
        // Create new user account with default role USER
        const newUser = manager.create(User, {
          email:
            profile.email ||
            `${profile.provider}_${profile.providerSubject}@tcg-nexus.oauth`,
          firstName: profile.firstName || "TCG",
          lastName: profile.lastName || "Player",
          avatarUrl: profile.avatarUrl,
          role: UserRole.USER,
          isPro: false,
          isActive: true,
          emailVerified: profile.emailVerified,
          preferredLocale: "fr",
        });
        user = await manager.save(User, newUser);

        // Create associated Player entity
        const player = manager.create(Player, {
          user,
          elo: 1500,
          level: 1,
          xp: 0,
        });
        await manager.save(Player, player);

        // Create default Collection entity
        const defaultCollection = manager.create(Collection, {
          name: "Ma Collection",
          user,
        });
        await manager.save(Collection, defaultCollection);
      }

      // Create AuthIdentity record
      const authIdentity = manager.create(AuthIdentity, {
        userId: user.id,
        user,
        provider: profile.provider,
        providerSubject: profile.providerSubject,
        providerEmail: profile.email,
        providerEmailVerified: profile.emailVerified,
      });
      await manager.save(AuthIdentity, authIdentity);

      return user;
    });
  }

  /**
   * Retrieves all OAuth identities linked to a specific user.
   *
   * @param userId - User ID.
   * @returns Array of linked identity summaries.
   */
  async getUserIdentities(
    userId: number,
  ): Promise<
    Array<{
      id: number;
      provider: OAuthProvider;
      email: string | null;
      createdAt: Date;
    }>
  > {
    const identities = await this.identityRepo.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    return identities.map((i) => ({
      id: i.id,
      provider: i.provider,
      email: i.providerEmail,
      createdAt: i.createdAt,
    }));
  }

  /**
   * Unlinks an OAuth provider from a user account after validating security constraints.
   *
   * @param userId - User ID.
   * @param provider - Provider to unlink.
   */
  async unlinkIdentity(userId: number, provider: OAuthProvider): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["identities"],
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const identityToUnlink = (user.identities || []).find(
      (i) => i.provider === provider,
    );
    if (!identityToUnlink) {
      throw new NotFoundException(
        `No identity found for provider '${provider}'.`,
      );
    }

    // Security constraint: User must retain at least a local password or another linked provider
    const otherIdentitiesCount = (user.identities || []).length - 1;
    const hasPassword = Boolean(user.password);

    if (!hasPassword && otherIdentitiesCount <= 0) {
      throw new ConflictException(
        "Cannot unlink the only authentication method. Please set a password or link another provider first.",
      );
    }

    await this.identityRepo.delete({ id: identityToUnlink.id });
  }
}
