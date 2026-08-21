import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  SerializeOptions,
  UnauthorizedException,
  UseGuards,
  UseGuards as UseGuardsDecorator,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { CookieOptions } from "express";
import { Request as ExpressRequest, Response } from "express";
import { SELF_SERIALIZATION_GROUP } from "../common/serialization-groups";
import { User } from "../user/entities/user.entity";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { LocalAuthGuard } from "./guards/local-auth.guard";

const isProduction = process.env.NODE_ENV === "production";

// `none` is only required when the web app and API use different sites.
// Same-site deployments should configure `lax` to reduce the CSRF surface.
const resolveSameSite = (): "none" | "lax" | "strict" => {
  const configured = process.env.COOKIE_SAMESITE?.trim().toLowerCase();
  if (
    configured === "lax" ||
    configured === "strict" ||
    configured === "none"
  ) {
    return configured;
  }
  return isProduction ? "none" : "lax";
};

const buildCookieOptions = (
  req: ExpressRequest,
  maxAge?: number,
): CookieOptions => {
  const explicitDomain = process.env.COOKIE_DOMAIN?.trim();

  let derivedDomain: string | undefined;

  if (!explicitDomain && process.env.FRONTEND_URL) {
    try {
      const parsedUrl = new URL(process.env.FRONTEND_URL);
      const frontendHost = parsedUrl.hostname.replace(/^www\./, "");
      const requestHost = (req.hostname || req.headers.host || "").toString();

      if (requestHost.endsWith(frontendHost)) {
        derivedDomain = frontendHost;
      }
    } catch (error) {
      console.error("Unable to derive cookie domain from FRONTEND_URL", error);
    }
  }

  const baseCookie: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: resolveSameSite(),
    domain: explicitDomain || derivedDomain,
  };

  return maxAge ? { ...baseCookie, maxAge } : baseCookie;
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * Calculates cookie maxAge values for authentication cookies based on token TTLs.
   *
   * @param rememberMe Whether the session should persist across browser restarts.
   * @returns Object containing maxAge durations for access and refresh tokens.
   */
  private getCookieMaxAges(rememberMe: boolean): {
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number | undefined;
  } {
    const accessTtl = this.authService.getAccessTokenTtlMs();
    const refreshTtl = this.authService.getRefreshTokenTtlMs();
    return {
      accessTokenMaxAge: accessTtl,
      refreshTokenMaxAge: rememberMe ? refreshTtl : undefined,
    };
  }

  /**
   * Authenticates user with credentials and sets authentication cookies.
   *
   * @param loginDto User credentials.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(LocalAuthGuard)
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Request() req: ExpressRequest & { user: User },
  ) {
    const rememberMe = req.headers["x-remember-me"] === "true";
    const result = await this.authService.login(loginDto, req.user);
    const { accessTokenMaxAge, refreshTokenMaxAge } =
      this.getCookieMaxAges(rememberMe);

    res.cookie(
      "accessToken",
      result.tokens.accessToken,
      buildCookieOptions(req, accessTokenMaxAge),
    );
    res.cookie(
      "refreshToken",
      result.tokens.refreshToken,
      buildCookieOptions(req, refreshTokenMaxAge),
    );
    res.json({
      user: result.user,
      tokens: result.tokens,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
    });
    return;
  }

  /**
   * Registers a new user account and sets authentication cookies.
   *
   * @param registerDto User registration data.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @Post("register")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    const rememberMe = req.headers["x-remember-me"] === "true";
    const result = await this.authService.register(registerDto);
    const { accessTokenMaxAge, refreshTokenMaxAge } =
      this.getCookieMaxAges(rememberMe);

    res.cookie(
      "accessToken",
      result.tokens.accessToken,
      buildCookieOptions(req, accessTokenMaxAge),
    );
    res.cookie(
      "refreshToken",
      result.tokens.refreshToken,
      buildCookieOptions(req, refreshTokenMaxAge),
    );
    res.json({
      user: result.user,
      tokens: result.tokens,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
    });
    return;
  }

  /**
   * Refreshes JWT access and refresh tokens.
   *
   * @param user Authenticated user from refresh guard.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(JwtRefreshGuard)
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiBearerAuth()
  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    const rememberMe = req.headers["x-remember-me"] === "true";
    if (!user.refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    const { accessTokenMaxAge, refreshTokenMaxAge } =
      this.getCookieMaxAges(rememberMe);

    res.cookie(
      "accessToken",
      tokens.accessToken,
      buildCookieOptions(req, accessTokenMaxAge),
    );
    res.cookie(
      "refreshToken",
      tokens.refreshToken,
      buildCookieOptions(req, refreshTokenMaxAge),
    );
    res.json({
      success: true,
      tokens,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    });
    return;
  }

  /**
   * Logs out the current user and clears authentication cookies.
   *
   * @param user Current authenticated user.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    await this.authService.logout(user.id);
    const baseCookieOptions = buildCookieOptions(req);

    res.clearCookie("accessToken", baseCookieOptions);
    res.clearCookie("refreshToken", baseCookieOptions);
    res.json({ message: "Logged out successfully" });
    return;
  }

  /**
   * Returns current user profile (POST endpoint).
   *
   * @param user Current authenticated user.
   * @returns User profile entity.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("profile")
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  getProfilePost(@CurrentUser() user: User) {
    return this.userService.findOne(user.id);
  }

  /**
   * Returns current user profile (GET endpoint).
   *
   * @param user Current authenticated user.
   * @returns User profile entity.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("profile")
  @SerializeOptions({ groups: [SELF_SERIALIZATION_GROUP] })
  getProfile(@CurrentUser() user: User) {
    return this.userService.findOne(user.id);
  }
}
