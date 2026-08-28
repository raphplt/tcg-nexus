import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type {
  CookieOptions,
  Request as ExpressRequest,
  Response,
} from "express";
import { User } from "src/user/entities/user.entity";
import { AuthService } from "../auth.service";
import { CurrentUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { OAuthProvider } from "../entities/auth-identity.entity";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { MobileOAuthExchangeDto } from "./dto/mobile-exchange.dto";
import { OAuthService, OAuthTransactionState } from "./oauth.service";

const isProduction = process.env.NODE_ENV === "production";

const buildTxCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge: 5 * 60 * 1000, // 5 minutes
  path: "/api/auth/oauth",
});

const buildAuthCookieOptions = (maxAge?: number): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge,
});

/**
 * Controller managing OAuth provider authorization, callbacks, and identity linking.
 */
@ApiTags("auth")
@Controller("auth")
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Lists all enabled OAuth identity providers.
   */
  @Public()
  @Get("oauth/providers")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List active OAuth providers" })
  getProviders() {
    return {
      providers: this.oauthService.getEnabledProviders(),
    };
  }

  /**
   * Initiates the Web OAuth authorization code flow with PKCE.
   */
  @Public()
  @Get("oauth/:provider/start")
  @ApiOperation({ summary: "Start Web OAuth authorization flow" })
  async startOAuth(
    @Param("provider") providerStr: string,
    @Query("returnTo") returnTo: string | undefined,
    @Req() req: ExpressRequest,
    @Res() res: Response,
  ) {
    const provider = providerStr.toLowerCase() as OAuthProvider;
    if (!Object.values(OAuthProvider).includes(provider)) {
      throw new BadRequestException(`Unknown OAuth provider: ${providerStr}`);
    }

    const validatedReturnTo = this.oauthService.validateReturnTo(returnTo);
    const { codeVerifier, codeChallenge } = this.oauthService.generatePkce();
    const state = this.oauthService.generateRandomString(24);
    const nonce = this.oauthService.generateRandomString(24);

    const txState: OAuthTransactionState = {
      provider,
      state,
      nonce,
      codeVerifier,
      returnTo: validatedReturnTo,
      createdAt: Date.now(),
    };

    // Store encrypted or base64 JSON in HttpOnly cookie
    res.cookie("oauth_tx", JSON.stringify(txState), buildTxCookieOptions());

    const apiBaseUrl =
      process.env.OAUTH_CALLBACK_BASE_URL ||
      `${req.protocol}://${req.get("host")}/api/auth/oauth`;
    const callbackUrl = `${apiBaseUrl}/${provider}/callback`;

    const authUrl = this.oauthService.getAuthorizationUrl(
      provider,
      state,
      codeChallenge,
      nonce,
      callbackUrl,
    );

    return res.redirect(authUrl);
  }

  /**
   * Handles Web OAuth callback from provider.
   */
  @Public()
  @Get("oauth/:provider/callback")
  @ApiOperation({ summary: "Web OAuth callback endpoint" })
  async handleCallback(
    @Param("provider") providerStr: string,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Req() req: ExpressRequest,
    @Res() res: Response,
  ) {
    const provider = providerStr.toLowerCase() as OAuthProvider;
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (error || !code || !state) {
      return res.redirect(
        `${frontendBaseUrl}/auth/login?error=oauth_cancelled`,
      );
    }

    const cookieTxRaw = req.cookies?.oauth_tx;
    if (!cookieTxRaw) {
      return res.redirect(
        `${frontendBaseUrl}/auth/login?error=oauth_session_expired`,
      );
    }

    let txState: OAuthTransactionState;
    try {
      txState = JSON.parse(cookieTxRaw);
    } catch {
      return res.redirect(
        `${frontendBaseUrl}/auth/login?error=oauth_invalid_state`,
      );
    }

    if (txState.state !== state || txState.provider !== provider) {
      return res.redirect(
        `${frontendBaseUrl}/auth/login?error=oauth_state_mismatch`,
      );
    }

    const apiBaseUrl =
      process.env.OAUTH_CALLBACK_BASE_URL ||
      `${req.protocol}://${req.get("host")}/api/auth/oauth`;
    const callbackUrl = `${apiBaseUrl}/${provider}/callback`;

    try {
      const profile = await this.oauthService.exchangeGoogleCode(
        code,
        txState.codeVerifier,
        callbackUrl,
      );

      const user = await this.oauthService.resolveOrCreateUser(profile);
      const tokens = await this.authService.generateTokens(user);

      const accessTtl = this.authService.getAccessTokenTtlMs();
      const refreshTtl = this.authService.getRefreshTokenTtlMs();

      res.cookie(
        "accessToken",
        tokens.accessToken,
        buildAuthCookieOptions(accessTtl),
      );
      res.cookie(
        "refreshToken",
        tokens.refreshToken,
        buildAuthCookieOptions(refreshTtl),
      );
      res.clearCookie("oauth_tx", { path: "/api/auth/oauth" });

      const destination = txState.returnTo.startsWith("/")
        ? `${frontendBaseUrl}${txState.returnTo}`
        : `${frontendBaseUrl}/`;

      return res.redirect(destination);
    } catch (err: any) {
      return res.redirect(`${frontendBaseUrl}/auth/login?error=oauth_failed`);
    }
  }

  /**
   * Mobile OAuth authorization code exchange endpoint returning JSON session tokens.
   */
  @Public()
  @Post("oauth/:provider/mobile/exchange")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange mobile OAuth code for TCG Nexus tokens" })
  async exchangeMobileCode(
    @Param("provider") providerStr: string,
    @Body() body: MobileOAuthExchangeDto,
  ) {
    const provider = providerStr.toLowerCase() as OAuthProvider;
    if (provider !== OAuthProvider.GOOGLE) {
      throw new BadRequestException(
        `Provider '${providerStr}' is not supported for mobile.`,
      );
    }

    const profile = await this.oauthService.exchangeGoogleCode(
      body.code,
      body.codeVerifier,
      body.redirectUri,
    );

    const user = await this.oauthService.resolveOrCreateUser(profile);
    const tokens = await this.authService.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isPro: user.isPro,
        preferredLocale: user.preferredLocale,
      },
      tokens,
    };
  }

  /**
   * Retrieves linked OAuth identities for authenticated user.
   */
  @Get("identities")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List linked identities for current user" })
  async getIdentities(@CurrentUser() user: User) {
    return this.oauthService.getUserIdentities(user.id);
  }

  /**
   * Unlinks an OAuth identity provider from the current user account.
   */
  @Delete("oauth/:provider/link")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unlink OAuth identity provider" })
  async unlinkIdentity(
    @CurrentUser() user: User,
    @Param("provider") providerStr: string,
  ) {
    const provider = providerStr.toLowerCase() as OAuthProvider;
    await this.oauthService.unlinkIdentity(user.id, provider);
    return {
      success: true,
      message: `Provider '${provider}' unlinked successfully.`,
    };
  }
}
