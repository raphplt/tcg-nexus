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
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
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

  if (
    !explicitDomain &&
    process.env.FRONTEND_URL &&
    process.env.FRONTEND_URL !== "undefined" &&
    process.env.FRONTEND_URL.startsWith("http")
  ) {
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
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate user and set session cookies" })
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
   * Dedicated Web login endpoint: sets HttpOnly cookies and returns user profile without JWT tokens in JSON.
   *
   * @param loginDto User credentials.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(LocalAuthGuard)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("web/login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dedicated web login returning HttpOnly session cookies",
  })
  async webLogin(
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
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
    });
    return;
  }

  /**
   * Dedicated Mobile login endpoint: returns JSON JWT tokens for SecureStore.
   *
   * @param loginDto User credentials.
   * @param req Express request.
   * @returns User profile and JWT token pair.
   */
  @UseGuards(LocalAuthGuard)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("mobile/login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dedicated mobile login returning JWT tokens in payload",
  })
  async mobileLogin(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest & { user: User },
  ) {
    const result = await this.authService.login(loginDto, req.user);
    return {
      user: result.user,
      tokens: result.tokens,
    };
  }

  /**
   * Registers a new user account and sets authentication cookies.
   *
   * @param registerDto User registration data.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @Post("register")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register new user and set session cookies" })
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
   * Dedicated Web register endpoint: sets HttpOnly cookies and returns user profile without JWT tokens in JSON.
   *
   * @param registerDto User registration data.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @Post("web/register")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Dedicated web register returning HttpOnly session cookies",
  })
  async webRegister(
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
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
    });
    return;
  }

  /**
   * Dedicated Mobile register endpoint: returns JSON JWT tokens for SecureStore.
   *
   * @param registerDto User registration data.
   * @returns User profile and JWT token pair.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @Post("mobile/register")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Dedicated mobile register returning JWT tokens in payload",
  })
  async mobileRegister(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      user: result.user,
      tokens: result.tokens,
    };
  }

  /**
   * Refreshes JWT access and refresh tokens.
   *
   * @param user Authenticated user from refresh guard.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(JwtRefreshGuard)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiBearerAuth()
  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh JWT token pair using cookie or bearer token",
  })
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
   * Dedicated Web refresh endpoint: sets updated HttpOnly cookies and returns success without raw tokens.
   *
   * @param user Authenticated user from refresh guard.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(JwtRefreshGuard)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiBearerAuth()
  @Post("web/refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dedicated web refresh updating HttpOnly session cookies",
  })
  async webRefreshTokens(
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
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    });
    return;
  }

  /**
   * Dedicated Mobile refresh endpoint: returns updated JWT tokens in JSON.
   *
   * @param user Authenticated user from refresh guard.
   * @returns Updated JWT token pair.
   */
  @UseGuards(JwtRefreshGuard)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiBearerAuth()
  @Post("mobile/refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dedicated mobile refresh returning updated JWT tokens",
  })
  async mobileRefreshTokens(@CurrentUser() user: User) {
    if (!user.refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    return {
      success: true,
      tokens,
    };
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
  @ApiOperation({
    summary: "Log out current user and invalidate cookies",
  })
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
   * Dedicated Web logout endpoint.
   *
   * @param user Current authenticated user.
   * @param res Express response.
   * @param req Express request.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("web/logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dedicated web logout clearing HttpOnly cookies",
  })
  async webLogout(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    return this.logout(user, res, req);
  }

  /**
   * Dedicated Mobile logout endpoint.
   *
   * @param user Current authenticated user.
   * @returns Status confirmation message.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("mobile/logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dedicated mobile logout invalidating refresh token",
  })
  async mobileLogout(@CurrentUser() user: User) {
    await this.authService.logout(user.id);
    return { message: "Logged out successfully" };
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
  @ApiOperation({ summary: "Get current user profile (POST)" })
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
  @ApiOperation({ summary: "Get current user profile (GET)" })
  getProfile(@CurrentUser() user: User) {
    return this.userService.findOne(user.id);
  }
}
